import type { DomainError } from '../shared/domain-error';
import type { Result } from '../shared/result';
import type { NewTransaction, Transaction } from './transaction';

export interface TransactionRepository {
  /**
   * In one DB transaction with the product row locked (SELECT … FOR UPDATE): if the
   * quantity exceeds the stock → OUT_OF_STOCK and nothing is inserted; otherwise the
   * transaction is inserted in PENDING. Unknown product → NOT_FOUND; idempotency key
   * already taken → CONFLICT.
   */
  createPendingIfStock(
    data: NewTransaction,
  ): Promise<Result<Transaction, DomainError>>;
  findById(id: string): Promise<Transaction | null>;
  findByIdempotencyKey(key: string): Promise<Transaction | null>;
  markGatewayId(id: string, gatewayTransactionId: string): Promise<Transaction>;
}

export const TRANSACTION_REPOSITORY = Symbol('TransactionRepository');
