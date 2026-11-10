import type { GatewayTransaction } from '../../domain/payment/payment-gateway';
import type { DomainError } from '../../domain/shared/domain-error';
import { ok, type Result } from '../../domain/shared/result';
import type { Transaction } from '../../domain/transaction/transaction';
import type { TransactionRepository } from '../../domain/transaction/transaction.repository';

/** Applies a final gateway status to a PENDING transaction (no-op otherwise). */
export class ApplyTransactionResult {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(
    transaction: Transaction,
    gateway: GatewayTransaction,
  ): Promise<Result<Transaction, DomainError>> {
    if (transaction.status !== 'PENDING' || gateway.status === 'PENDING') {
      return ok(transaction);
    }
    return ok(
      await this.transactions.applyResult(transaction.id, {
        status: gateway.status,
        gatewayTransactionId: gateway.id,
        failureReason:
          gateway.status === 'APPROVED'
            ? null
            : (gateway.statusMessage ?? gateway.status),
      }),
    );
  }
}
