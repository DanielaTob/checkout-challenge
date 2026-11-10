import { randomUUID } from 'node:crypto';
import type { CustomerRepository } from '../../domain/customer/customer.repository';
import type { Shipping } from '../../domain/delivery/delivery';
import { type CardInput, validateCard } from '../../domain/payment/card';
import type { PaymentGateway } from '../../domain/payment/payment-gateway';
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
import type { PollTransactionStatus } from './poll-transaction-status.use-case';

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
  readonly newReference?: () => string;
}

const defaultReference = () => `TX-${randomUUID()}`;

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
    if (!pending.ok) return pending;

    const paid = await this.charge(pending.value, customer.email, input.card);
    if (!paid.ok) {
      await transactions.applyResult(pending.value.id, {
        status: 'ERROR',
        gatewayTransactionId: null,
        failureReason: paid.error.message,
      });
      return paid;
    }
    return ok({ transaction: paid.value, created: true });
  }

  private charge(
    transaction: Transaction,
    customerEmail: string,
    card: CardInput,
  ): Promise<Result<Transaction, DomainError>> {
    const { gateway, transactions, poll, apply } = this.deps;
    return andThenAsync(gateway.getAcceptanceTokens(), (acceptance) =>
      andThenAsync(gateway.tokenizeCard(card), (token) =>
        andThenAsync(
          gateway.createTransaction({
            acceptance,
            cardToken: token.id,
            reference: transaction.reference,
            amountInCents: transaction.amountInCents,
            currency: CURRENCY,
            customerEmail,
          }),
          async (created) => {
            const marked = await transactions.markGatewayId(
              transaction.id,
              created.id,
            );
            return andThenAsync(poll.execute(created), (latest) =>
              apply.execute(marked, latest),
            );
          },
        ),
      ),
    );
  }
}
