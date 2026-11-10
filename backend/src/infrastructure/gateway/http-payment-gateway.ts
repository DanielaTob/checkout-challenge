import { Logger } from '@nestjs/common';
import type { CardInput } from '../../domain/payment/card';
import type {
  AcceptanceTokens,
  CardToken,
  GatewayPaymentRequest,
  GatewayTransaction,
  PaymentGateway,
} from '../../domain/payment/payment-gateway';
import { integritySignature } from '../../domain/payment/signature';
import {
  domainError,
  type DomainError,
} from '../../domain/shared/domain-error';
import { err, ok, type Result } from '../../domain/shared/result';
import type { TransactionStatus } from '../../domain/transaction/transaction-status';
import { retry } from './retry';

export interface GatewayConfig {
  readonly baseUrl: string;
  readonly publicKey: string;
  readonly privateKey: string;
  readonly integritySecret: string;
  /** Per-request timeout; slower answers are treated as GATEWAY_ERROR. */
  readonly timeoutMs: number;
}

export const DEFAULT_GATEWAY_TIMEOUT_MS = 8000;
/** Extra attempts for transient failures of the status read (GET only). */
export const STATUS_READ_RETRIES = 2;

export type FetchFn = typeof fetch;

interface RawResponse {
  readonly status: number;
  readonly json: unknown;
}

const gatewayError = (message: string) =>
  err(domainError('GATEWAY_ERROR', message));

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

/** Safe nested read: path(obj, 'data', 'id') → unknown. */
const path = (obj: unknown, ...keys: string[]): unknown =>
  keys.reduce<unknown>((acc, k) => (isRecord(acc) ? acc[k] : undefined), obj);

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;

const STATUS_MAP: Record<string, TransactionStatus> = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  VOIDED: 'DECLINED',
  ERROR: 'ERROR',
};

/**
 * Adapter: implements the PaymentGateway port over HTTP (sandbox). Never logs request
 * bodies or headers (card data and keys); only the operation name and the HTTP status.
 */
export class HttpPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger('PaymentGateway');

  constructor(
    private readonly config: GatewayConfig,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async getAcceptanceTokens(): Promise<Result<AcceptanceTokens, DomainError>> {
    const res = await this.call(
      'merchant',
      'GET',
      `/merchants/${this.config.publicKey}`,
    );
    if (!res.ok) return res;
    const acceptanceToken = str(
      path(res.value.json, 'data', 'presigned_acceptance', 'acceptance_token'),
    );
    const personalDataAuthToken = str(
      path(
        res.value.json,
        'data',
        'presigned_personal_data_auth',
        'acceptance_token',
      ),
    );
    if (res.value.status !== 200 || !acceptanceToken || !personalDataAuthToken)
      return gatewayError('Could not get acceptance tokens');
    return ok({ acceptanceToken, personalDataAuthToken });
  }

  async tokenizeCard(card: CardInput): Promise<Result<CardToken, DomainError>> {
    const res = await this.call('tokenize', 'POST', '/tokens/cards', {
      auth: this.config.publicKey,
      body: {
        number: card.number.replace(/\s+/g, ''),
        cvc: card.cvc,
        exp_month: card.expMonth,
        exp_year: card.expYear,
        card_holder: card.holderName,
      },
    });
    if (!res.ok) return res;
    if (res.value.status === 422) {
      return err(
        domainError('VALIDATION', 'The payment gateway rejected the card data'),
      );
    }
    const id = str(path(res.value.json, 'data', 'id'));
    if (res.value.status !== 201 || !id)
      return gatewayError('Could not tokenize the card');
    return ok({ id });
  }

  async createTransaction(
    req: GatewayPaymentRequest,
  ): Promise<Result<GatewayTransaction, DomainError>> {
    const res = await this.call('create-transaction', 'POST', '/transactions', {
      auth: this.config.privateKey,
      body: {
        acceptance_token: req.acceptance.acceptanceToken,
        accept_personal_auth: req.acceptance.personalDataAuthToken,
        amount_in_cents: req.amountInCents,
        currency: req.currency,
        signature: integritySignature(
          req.reference,
          req.amountInCents,
          req.currency,
          this.config.integritySecret,
        ),
        customer_email: req.customerEmail,
        reference: req.reference,
        payment_method: { type: 'CARD', token: req.cardToken, installments: 1 },
      },
    });
    if (!res.ok) return res;
    if (res.value.status !== 201)
      return gatewayError(
        `The payment gateway refused the transaction (HTTP ${res.value.status})`,
      );
    return this.toTransaction(res.value.json);
  }

  async getTransaction(
    id: string,
  ): Promise<Result<GatewayTransaction, DomainError>> {
    // Transient failures (5xx, timeout, network) are retried; a 4xx answer is not.
    const res = await retry(
      () =>
        this.call(
          'get-transaction',
          'GET',
          `/transactions/${encodeURIComponent(id)}`,
        ),
      STATUS_READ_RETRIES,
    );
    if (!res.ok) return res;
    if (res.value.status !== 200)
      return gatewayError(
        `Could not read the gateway transaction (HTTP ${res.value.status})`,
      );
    return this.toTransaction(res.value.json);
  }

  private toTransaction(
    json: unknown,
  ): Result<GatewayTransaction, DomainError> {
    const id = str(path(json, 'data', 'id'));
    const status = STATUS_MAP[String(path(json, 'data', 'status'))];
    if (!id || !status)
      return gatewayError('Unexpected payment gateway response');
    return ok({
      id,
      status,
      statusMessage: str(path(json, 'data', 'status_message')),
    });
  }

  private async call(
    operation: string,
    method: 'GET' | 'POST',
    urlPath: string,
    options: { auth?: string; body?: unknown } = {},
  ): Promise<Result<RawResponse, DomainError>> {
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    if (options.body !== undefined)
      headers['content-type'] = 'application/json';
    if (options.auth) headers.authorization = `Bearer ${options.auth}`;
    try {
      const res = await this.fetchFn(
        `${this.config.baseUrl.replace(/\/+$/, '')}${urlPath}`,
        {
          method,
          headers,
          body:
            options.body === undefined
              ? undefined
              : JSON.stringify(options.body),
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );
      const json: unknown = await res.json().catch(() => null);
      if (res.status >= 500) {
        this.logger.warn(`${operation} failed with HTTP ${res.status}`);
        return gatewayError(`Payment gateway error (HTTP ${res.status})`);
      }
      return ok({ status: res.status, json });
    } catch (e) {
      const name = isRecord(e) ? e.name : undefined;
      const timedOut = name === 'TimeoutError' || name === 'AbortError';
      this.logger.warn(`${operation} ${timedOut ? 'timed out' : 'failed'}`);
      return gatewayError(
        timedOut
          ? 'The payment gateway did not answer in time'
          : 'The payment gateway is unreachable',
      );
    }
  }
}
