import type { Delivery, Shipping } from '../delivery/delivery';
import type { CardBrand } from '../payment/card';
import type { FinalStatus, TransactionStatus } from './transaction-status';

/** failureReason used only when the stock ran out while the payment was in flight. */
export const OUT_OF_STOCK_AFTER_PAYMENT = 'OUT_OF_STOCK_AFTER_PAYMENT';

export interface Transaction {
  readonly id: string;
  readonly reference: string;
  readonly productId: string;
  readonly customerId: string;
  readonly quantity: number;
  /** Total charged: subtotal + base fee + delivery fee. */
  readonly amountInCents: number;
  readonly baseFeeInCents: number;
  readonly deliveryFeeInCents: number;
  readonly status: TransactionStatus;
  readonly gatewayTransactionId: string | null;
  readonly cardBrand: CardBrand | null;
  readonly cardLast4: string | null;
  readonly idempotencyKey: string | null;
  readonly shipping: Shipping | null;
  readonly failureReason: string | null;
  readonly delivery: Delivery | null;
  readonly createdAt: Date;
}

export interface NewTransaction {
  readonly reference: string;
  readonly productId: string;
  readonly customerId: string;
  readonly quantity: number;
  readonly amountInCents: number;
  readonly baseFeeInCents: number;
  readonly deliveryFeeInCents: number;
  readonly cardBrand: CardBrand;
  readonly cardLast4: string;
  readonly idempotencyKey: string | null;
  readonly shipping: Shipping;
}

export interface TransactionOutcome {
  readonly status: FinalStatus;
  readonly gatewayTransactionId: string | null;
  readonly failureReason: string | null;
}
