import type { PaymentGateway } from '../../domain/payment/payment-gateway';
import type { DomainError } from '../../domain/shared/domain-error';
import { andThenAsync, ok, type Result } from '../../domain/shared/result';
import type { Transaction } from '../../domain/transaction/transaction';
import type { ApplyTransactionResult } from './apply-transaction-result.use-case';

/** A PENDING transaction already sent to the gateway is re-read there and the result applied. */
export class RefreshTransaction {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly apply: ApplyTransactionResult,
  ) {}

  async execute(
    transaction: Transaction,
  ): Promise<Result<Transaction, DomainError>> {
    if (transaction.status !== 'PENDING' || !transaction.gatewayTransactionId) {
      return ok(transaction);
    }
    return andThenAsync(
      this.gateway.getTransaction(transaction.gatewayTransactionId),
      (latest) => this.apply.execute(transaction, latest),
    );
  }
}
