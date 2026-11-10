import {
  domainError,
  type DomainError,
} from '../../domain/shared/domain-error';
import { err, type Result } from '../../domain/shared/result';
import type { Transaction } from '../../domain/transaction/transaction';
import type { TransactionRepository } from '../../domain/transaction/transaction.repository';
import type { RefreshTransaction } from './refresh-transaction.use-case';

/** Lets the client recover a payment it sent but whose answer it lost (reload mid-payment). */
export class GetTransactionByKey {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly refresh: RefreshTransaction,
  ) {}

  async execute(key: string): Promise<Result<Transaction, DomainError>> {
    const transaction = await this.transactions.findByIdempotencyKey(key);
    if (!transaction) {
      return err(
        domainError('NOT_FOUND', 'No transaction for that Idempotency-Key'),
      );
    }
    return this.refresh.execute(transaction);
  }
}
