import type { DomainError } from '../shared/domain-error';
import type { Result } from '../shared/result';
import type { TransactionStatus } from '../transaction/transaction-status';
import type { CardInput } from './card';

/** Single-use tokens: end-user policy + personal data authorization. */
export interface AcceptanceTokens {
  readonly acceptanceToken: string;
  readonly personalDataAuthToken: string;
}

export interface CardToken {
  readonly id: string;
}

export interface GatewayPaymentRequest {
  readonly acceptance: AcceptanceTokens;
  readonly cardToken: string;
  readonly reference: string;
  readonly amountInCents: number;
  readonly currency: string;
  readonly customerEmail: string;
}

export interface GatewayTransaction {
  readonly id: string;
  readonly status: TransactionStatus;
  readonly statusMessage: string | null;
}

/** Per-call limit: the adapter uses min(its own timeout, timeoutMs). */
export interface GatewayCallOptions {
  readonly timeoutMs?: number;
}

/**
 * Port to the payment gateway. Every call returns a Result; transport failures,
 * timeouts and unexpected responses are GATEWAY_ERROR.
 */
export interface PaymentGateway {
  getAcceptanceTokens(
    options?: GatewayCallOptions,
  ): Promise<Result<AcceptanceTokens, DomainError>>;
  tokenizeCard(
    card: CardInput,
    options?: GatewayCallOptions,
  ): Promise<Result<CardToken, DomainError>>;
  createTransaction(
    request: GatewayPaymentRequest,
    options?: GatewayCallOptions,
  ): Promise<Result<GatewayTransaction, DomainError>>;
  /** Transient failures are retried while the time limit allows it. */
  getTransaction(
    id: string,
    options?: GatewayCallOptions,
  ): Promise<Result<GatewayTransaction, DomainError>>;
}

export const PAYMENT_GATEWAY = Symbol('PaymentGateway');
