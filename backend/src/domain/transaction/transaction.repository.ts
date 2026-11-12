import type { DomainError } from '../shared/domain-error';
import type { Result } from '../shared/result';
import type {
  NewTransaction,
  Transaction,
  TransactionOutcome,
} from './transaction';

/** Result of applyResult: `claimed` is true only for the call that moved the row out of PENDING. */
export interface AppliedOutcome {
  readonly transaction: Transaction;
  readonly claimed: boolean;
}

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
  /**
   * Atomic and idempotent: only a PENDING transaction changes. APPROVED decrements the
   * stock (never below 0) and creates the delivery; if the stock ran out meanwhile the
   * transaction ends in ERROR with OUT_OF_STOCK_AFTER_PAYMENT. Applying twice is a no-op
   * (`claimed: false`), so callers can emit side effects exactly once.
   */
  applyResult(id: string, outcome: TransactionOutcome): Promise<AppliedOutcome>;
}

export const TRANSACTION_REPOSITORY = Symbol('TransactionRepository');
