import type { Delivery } from '../domain/delivery/delivery';
import type { DeliveryRepository } from '../domain/delivery/delivery.repository';
import { domainError, type DomainError } from '../domain/shared/domain-error';
import { err, ok, type Result } from '../domain/shared/result';
import {
  OUT_OF_STOCK_AFTER_PAYMENT,
  type NewTransaction,
  type Transaction,
  type TransactionOutcome,
} from '../domain/transaction/transaction';
import type {
  AppliedOutcome,
  TransactionRepository,
} from '../domain/transaction/transaction.repository';
import type { InMemoryProductRepository } from './in-memory-product.repository';

/**
 * Test double with the same semantics as the Prisma adapter: stock checked at creation,
 * atomic + idempotent applyResult.
 */
const claimed = (transaction: Transaction): AppliedOutcome => ({
  transaction,
  claimed: true,
});

export class InMemoryTransactionRepository implements TransactionRepository {
  readonly rows: Transaction[] = [];
  readonly log: string[] = [];
  private seq = 0;
  /** DeliveryRepository view over the same rows. */
  readonly deliveries: DeliveryRepository = {
    findById: (id) =>
      Promise.resolve(
        this.rows.find((r) => r.delivery?.id === id)?.delivery ?? null,
      ),
  };

  constructor(private readonly products: InMemoryProductRepository) {}

  createPendingIfStock(
    data: NewTransaction,
  ): Promise<Result<Transaction, DomainError>> {
    this.log.push('createPendingIfStock');
    const stock = this.products.stockOf(data.productId);
    if (stock === undefined)
      return Promise.resolve(err(domainError('NOT_FOUND', 'no product')));
    if (data.quantity > stock)
      return Promise.resolve(err(domainError('OUT_OF_STOCK', 'no stock')));
    if (
      data.idempotencyKey &&
      this.rows.some((r) => r.idempotencyKey === data.idempotencyKey)
    )
      return Promise.resolve(err(domainError('CONFLICT', 'key used')));
    this.seq++;
    const row: Transaction = {
      id: `8b1d2c3a-0000-4000-8000-${String(this.seq).padStart(12, '0')}`,
      ...data,
      status: 'PENDING',
      gatewayTransactionId: null,
      failureReason: null,
      delivery: null,
      createdAt: new Date('2026-11-10T00:00:00Z'),
    };
    this.rows.push(row);
    return Promise.resolve(ok(row));
  }

  findById(id: string): Promise<Transaction | null> {
    return Promise.resolve(this.rows.find((r) => r.id === id) ?? null);
  }

  findByIdempotencyKey(key: string): Promise<Transaction | null> {
    return Promise.resolve(
      this.rows.find((r) => r.idempotencyKey === key) ?? null,
    );
  }

  markGatewayId(
    id: string,
    gatewayTransactionId: string,
  ): Promise<Transaction> {
    this.log.push('markGatewayId');
    return Promise.resolve(this.update(id, { gatewayTransactionId }));
  }

  applyResult(
    id: string,
    outcome: TransactionOutcome,
  ): Promise<AppliedOutcome> {
    this.log.push(`applyResult:${outcome.status}`);
    const current = this.rows.find((r) => r.id === id)!;
    if (current.status !== 'PENDING')
      return Promise.resolve({ transaction: current, claimed: false });
    const gatewayTransactionId =
      outcome.gatewayTransactionId ?? current.gatewayTransactionId;
    if (outcome.status !== 'APPROVED') {
      return Promise.resolve(
        claimed(
          this.update(id, {
            status: outcome.status,
            failureReason: outcome.failureReason,
            gatewayTransactionId,
          }),
        ),
      );
    }
    const stock = this.products.stockOf(current.productId)!;
    if (stock < current.quantity) {
      return Promise.resolve(
        claimed(
          this.update(id, {
            status: 'ERROR',
            failureReason: OUT_OF_STOCK_AFTER_PAYMENT,
            gatewayTransactionId,
          }),
        ),
      );
    }
    this.products.setStock(current.productId, stock - current.quantity);
    const delivery: Delivery = {
      id: `9c1d2c3a-0000-4000-8000-${id.slice(-12)}`,
      transactionId: id,
      customerId: current.customerId,
      ...current.shipping!,
      status: 'PENDING',
    };
    return Promise.resolve(
      claimed(
        this.update(id, {
          status: 'APPROVED',
          failureReason: null,
          gatewayTransactionId,
          delivery,
        }),
      ),
    );
  }

  private update(id: string, patch: Partial<Transaction>): Transaction {
    const index = this.rows.findIndex((r) => r.id === id);
    this.rows[index] = { ...this.rows[index], ...patch };
    return this.rows[index];
  }
}
