import {
  domainError,
  type DomainError,
} from '../../domain/shared/domain-error';
import { err, type Result } from '../../domain/shared/result';
import type { Transaction } from '../../domain/transaction/transaction';
import type { TransactionRepository } from '../../domain/transaction/transaction.repository';
import type { RefreshTransaction } from './refresh-transaction.use-case';

export class GetTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly refresh: RefreshTransaction,
  ) {}

  async execute(id: string): Promise<Result<Transaction, DomainError>> {
    const transaction = await this.transactions.findById(id);
    if (!transaction) {
      return err(domainError('NOT_FOUND', `Transaction ${id} not found`));
    }
    return this.refresh.execute(transaction);
  }
}
