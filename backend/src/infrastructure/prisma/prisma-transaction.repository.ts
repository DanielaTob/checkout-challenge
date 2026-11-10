import { Injectable } from '@nestjs/common';
import type { Delivery, Shipping } from '../../domain/delivery/delivery';
import type { CardBrand } from '../../domain/payment/card';
import {
  domainError,
  type DomainError,
} from '../../domain/shared/domain-error';
import { err, ok, type Result } from '../../domain/shared/result';
import {
  OUT_OF_STOCK_AFTER_PAYMENT,
  type NewTransaction,
  type Transaction,
  type TransactionOutcome,
} from '../../domain/transaction/transaction';
import type { TransactionRepository } from '../../domain/transaction/transaction.repository';
import type {
  Delivery as DeliveryRow,
  Transaction as TransactionRow,
} from '../../generated/prisma/client';
import { PrismaService } from './prisma.service';

type Row = TransactionRow & { delivery: DeliveryRow | null };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const parseShipping = (json: unknown): Shipping | null =>
  isRecord(json) &&
  typeof json.address === 'string' &&
  typeof json.city === 'string' &&
  typeof json.region === 'string' &&
  typeof json.postalCode === 'string'
    ? {
        address: json.address,
        city: json.city,
        region: json.region,
        postalCode: json.postalCode,
      }
    : null;

export const toDeliveryDomain = (row: DeliveryRow): Delivery => ({
  id: row.id,
  transactionId: row.transactionId,
  customerId: row.customerId,
  address: row.address,
  city: row.city,
  region: row.region,
  postalCode: row.postalCode,
  status: row.status,
});

const toDomain = (row: Row): Transaction => ({
  id: row.id,
  reference: row.reference,
  productId: row.productId,
  customerId: row.customerId,
  quantity: row.quantity,
  amountInCents: row.amountInCents,
  baseFeeInCents: row.baseFeeInCents,
  deliveryFeeInCents: row.deliveryFeeInCents,
  status: row.status,
  gatewayTransactionId: row.gatewayTransactionId,
  cardBrand: row.cardBrand as CardBrand | null,
  cardLast4: row.cardLast4,
  idempotencyKey: row.idempotencyKey,
  shipping: parseShipping(row.shipping),
  failureReason: row.failureReason,
  delivery: row.delivery ? toDeliveryDomain(row.delivery) : null,
  createdAt: row.createdAt,
});

const isUniqueViolation = (e: unknown): boolean =>
  isRecord(e) && e.code === 'P2002';

const include = { delivery: true } as const;

/** Adapter: implements the TransactionRepository port with Prisma. */
@Injectable()
export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPendingIfStock(
    data: NewTransaction,
  ): Promise<Result<Transaction, DomainError>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ stock: number }>>`
          SELECT stock FROM products WHERE id = ${data.productId}::uuid FOR UPDATE`;
        if (rows.length === 0) {
          return err(
            domainError('NOT_FOUND', `Product ${data.productId} not found`),
          );
        }
        if (data.quantity > rows[0].stock) {
          return err(
            domainError(
              'OUT_OF_STOCK',
              `Only ${rows[0].stock} unit(s) of product ${data.productId} left`,
            ),
          );
        }
        const row = await tx.transaction.create({
          data: { ...data, shipping: { ...data.shipping }, status: 'PENDING' },
          include,
        });
        return ok(toDomain(row));
      });
    } catch (e) {
      if (isUniqueViolation(e)) {
        return err(
          domainError('CONFLICT', 'Idempotency-Key or reference already used'),
        );
      }
      throw e;
    }
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({
      where: { id },
      include,
    });
    return row ? toDomain(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: key },
      include,
    });
    return row ? toDomain(row) : null;
  }

  async markGatewayId(
    id: string,
    gatewayTransactionId: string,
  ): Promise<Transaction> {
    const row = await this.prisma.transaction.update({
      where: { id },
      data: { gatewayTransactionId },
      include,
    });
    return toDomain(row);
  }

  async applyResult(
    id: string,
    outcome: TransactionOutcome,
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      // Claim: only one caller can move the row out of PENDING (row lock + re-check).
      const claimed = await tx.transaction.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: outcome.status,
          failureReason: outcome.failureReason,
          ...(outcome.gatewayTransactionId
            ? { gatewayTransactionId: outcome.gatewayTransactionId }
            : {}),
        },
      });
      if (claimed.count === 1 && outcome.status === 'APPROVED') {
        const row = await tx.transaction.findUniqueOrThrow({ where: { id } });
        const shipping = parseShipping(row.shipping);
        // Invariant: shipping is stored at creation. Throwing rolls the claim back.
        if (!shipping) throw new Error(`Transaction ${id} has no shipping`);
        const decremented = await tx.product.updateMany({
          where: { id: row.productId, stock: { gte: row.quantity } },
          data: { stock: { decrement: row.quantity } },
        });
        if (decremented.count === 0) {
          // Another payment took the last units while this one was in flight.
          await tx.transaction.update({
            where: { id },
            data: {
              status: 'ERROR',
              failureReason: OUT_OF_STOCK_AFTER_PAYMENT,
            },
          });
        } else {
          await tx.delivery.create({
            data: {
              transactionId: id,
              customerId: row.customerId,
              ...shipping,
            },
          });
        }
      }
      return toDomain(
        await tx.transaction.findUniqueOrThrow({ where: { id }, include }),
      );
    });
  }
}
