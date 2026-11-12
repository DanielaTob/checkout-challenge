import type { Transaction } from './transaction';

/**
 * Port: business events of the payment lifecycle (spec 010). The domain does not know they
 * become log lines and metrics. Implementations must never throw.
 */
export interface PaymentEvents {
  /** A transaction left PENDING (APPROVED, DECLINED or ERROR). Called once per transaction. */
  finalized(transaction: Transaction): void;
}

export const PAYMENT_EVENTS = Symbol('PaymentEvents');

export const noPaymentEvents: PaymentEvents = { finalized: () => undefined };
