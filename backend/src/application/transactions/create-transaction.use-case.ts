import { randomUUID } from 'node:crypto';
import type { CustomerRepository } from '../../domain/customer/customer.repository';
import type { Shipping } from '../../domain/delivery/delivery';
import { type CardInput, validateCard } from '../../domain/payment/card';
import type {
  GatewayCallOptions,
  PaymentGateway,
} from '../../domain/payment/payment-gateway';
import type { ProductRepository } from '../../domain/product/product.repository';
import {
  buildQuote,
  CURRENCY,
  type FeesProvider,
} from '../../domain/quote/quote';
import type { Clock } from '../../domain/shared/clock';
import {
  domainError,
  type DomainError,
} from '../../domain/shared/domain-error';
import { andThenAsync, err, ok, type Result } from '../../domain/shared/result';
import type { Transaction } from '../../domain/transaction/transaction';
import type { TransactionRepository } from '../../domain/transaction/transaction.repository';
import type { ApplyTransactionResult } from './apply-transaction-result.use-case';
import type { PaymentEvents } from '../../domain/transaction/payment-events';
import type { PollTransactionStatus } from './poll-transaction-status.use-case';
import type { RefreshTransaction } from './refresh-transaction.use-case';

export interface CreateTransactionInput {
  readonly idempotencyKey: string | null;
  readonly productId: string;
  readonly customerId: string;
  readonly quantity: number;
  readonly shipping: Shipping;
  /** In memory only: never stored, logged or returned. */
  readonly card: CardInput;
}

export interface CreatedTransaction {
  readonly transaction: Transaction;
  /** false when an existing transaction was returned for the same Idempotency-Key. */
  readonly created: boolean;
}

export interface CreateTransactionDeps {
  readonly products: ProductRepository;
  readonly customers: CustomerRepository;
  readonly transactions: TransactionRepository;
  readonly gateway: PaymentGateway;
  readonly fees: FeesProvider;
  readonly clock: Clock;
  readonly poll: PollTransactionStatus;
  readonly apply: ApplyTransactionResult;
  readonly refresh: RefreshTransaction;
  /** Business events (spec 010); the gateway-failure ERROR is reported here. */
  readonly events?: PaymentEvents;
  readonly newReference?: () => string;
  /** Total time for the payment request; defaults to PAYMENT_TIME_BUDGET_MS. */
  readonly budgetMs?: number;
}

const defaultReference = () => `TX-${randomUUID()}`;

/** Whole POST /transactions stays well below the ~30 s API Gateway limit. */
export const PAYMENT_TIME_BUDGET_MS = 15000;

/**
 * validate card → product/customer → quote → PENDING (stock checked under lock)
 * → gateway (acceptance, tokenize, create) → poll → apply. Each step on the Result railway.
 */
export class CreateTransaction {
  constructor(private readonly deps: CreateTransactionDeps) {}

  async execute(
    input: CreateTransactionInput,
  ): Promise<Result<CreatedTransaction, DomainError>> {
    const { products, customers, transactions, fees, clock } = this.deps;
    const deadline =
      clock.now().getTime() + (this.deps.budgetMs ?? PAYMENT_TIME_BUDGET_MS);

    if (input.idempotencyKey) {
      const existing = await transactions.findByIdempotencyKey(
        input.idempotencyKey,
      );
      if (existing) return this.replay(existing, input);
    }

    const card = validateCard(input.card, clock.now());
    if (!card.ok) return card;

    const product = await products.findById(input.productId);
    if (!product) {
      return err(
        domainError('NOT_FOUND', `Product ${input.productId} not found`),
      );
    }
    const customer = await customers.findById(input.customerId);
    if (!customer) {
      return err(
        domainError('NOT_FOUND', `Customer ${input.customerId} not found`),
      );
    }

    const quote = buildQuote(product, input.quantity, fees.getFees());
    if (!quote.ok) return quote;

    const pending = await transactions.createPendingIfStock({
      reference: (this.deps.newReference ?? defaultReference)(),
      productId: product.id,
      customerId: customer.id,
      quantity: input.quantity,
      amountInCents: quote.value.totalInCents,
      baseFeeInCents: quote.value.baseFeeInCents,
      deliveryFeeInCents: quote.value.deliveryFeeInCents,
      cardBrand: card.value.brand,
      cardLast4: card.value.last4,
      idempotencyKey: input.idempotencyKey,
      shipping: input.shipping,
    });
    if (!pending.ok) {
      // Two requests with the same key raced: the other one inserted first.
      const raced =
        pending.error.code === 'CONFLICT' && input.idempotencyKey
          ? await transactions.findByIdempotencyKey(input.idempotencyKey)
          : null;
      return raced ? this.replay(raced, input) : pending;
    }

    const paid = await this.charge(
      pending.value,
      customer.email,
      input.card,
      deadline,
    );
    if (!paid.ok) {
      const failed = await transactions.applyResult(pending.value.id, {
        status: 'ERROR',
        gatewayTransactionId: null,
        failureReason: paid.error.message,
      });
      if (failed.claimed) this.deps.events?.finalized(failed.transaction);
      return paid;
    }
    return ok({ transaction: paid.value, created: true });
  }

  /** Same Idempotency-Key: never charge again; return the (refreshed) transaction. */
  private async replay(
    existing: Transaction,
    input: CreateTransactionInput,
  ): Promise<Result<CreatedTransaction, DomainError>> {
    if (
      existing.productId !== input.productId ||
      existing.customerId !== input.customerId ||
      existing.quantity !== input.quantity
    ) {
      return err(
        domainError(
          'CONFLICT',
          'Idempotency-Key already used with a different request',
        ),
      );
    }
    const refreshed = await this.deps.refresh.execute(existing);
    return ok({
      transaction: refreshed.ok ? refreshed.value : existing,
      created: false,
    });
  }

  private charge(
    transaction: Transaction,
    customerEmail: string,
    card: CardInput,
    deadline: number,
  ): Promise<Result<Transaction, DomainError>> {
    const { gateway, transactions, poll, apply } = this.deps;
    const timed = this.withinBudget(deadline);
    return andThenAsync(
      timed((o) => gateway.getAcceptanceTokens(o)),
      (acceptance) =>
        andThenAsync(
          timed((o) => gateway.tokenizeCard(card, o)),
          (token) =>
            andThenAsync(
              timed((o) =>
                gateway.createTransaction(
                  {
                    acceptance,
                    cardToken: token.id,
                    reference: transaction.reference,
                    amountInCents: transaction.amountInCents,
                    currency: CURRENCY,
                    customerEmail,
                  },
                  o,
                ),
              ),
              async (created) => {
                // From here the charge exists: running out of time means PENDING, not error.
                const marked = await transactions.markGatewayId(
                  transaction.id,
                  created.id,
                );
                return andThenAsync(poll.execute(created, deadline), (latest) =>
                  apply.execute(marked, latest),
                );
              },
            ),
        ),
    );
  }

  /** Runs a gateway call with the time left, or fails if the budget is already spent. */
  private withinBudget(deadline: number) {
    return <T>(
      call: (options: GatewayCallOptions) => Promise<Result<T, DomainError>>,
    ): Promise<Result<T, DomainError>> => {
      const timeoutMs = deadline - this.deps.clock.now().getTime();
      return timeoutMs > 0
        ? call({ timeoutMs })
        : Promise.resolve(
            err(
              domainError(
                'GATEWAY_ERROR',
                'The payment gateway is too slow: no charge was made',
              ),
            ),
          );
    };
  }
}
