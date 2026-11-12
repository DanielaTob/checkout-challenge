import type { GatewayTransaction } from '../../domain/payment/payment-gateway';
import type { DomainError } from '../../domain/shared/domain-error';
import { ok, type Result } from '../../domain/shared/result';
import {
  noPaymentEvents,
  type PaymentEvents,
} from '../../domain/transaction/payment-events';
import type { Transaction } from '../../domain/transaction/transaction';
import type { TransactionRepository } from '../../domain/transaction/transaction.repository';

/**
 * Applies a final gateway status to a PENDING transaction (no-op otherwise) and emits
 * `finalized` only when this call claimed the transition, so concurrent polls and reloads
 * never report the same payment twice.
 */
export class ApplyTransactionResult {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly events: PaymentEvents = noPaymentEvents,
  ) {}

  async execute(
    transaction: Transaction,
    gateway: GatewayTransaction,
  ): Promise<Result<Transaction, DomainError>> {
    if (transaction.status !== 'PENDING' || gateway.status === 'PENDING') {
      return ok(transaction);
    }
    const applied = await this.transactions.applyResult(transaction.id, {
      status: gateway.status,
      gatewayTransactionId: gateway.id,
      failureReason:
        gateway.status === 'APPROVED'
          ? null
          : (gateway.statusMessage ?? gateway.status),
    });
    if (applied.claimed) this.events.finalized(applied.transaction);
    return ok(applied.transaction);
  }
}
