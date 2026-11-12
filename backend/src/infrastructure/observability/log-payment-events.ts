import { Logger } from '@nestjs/common';
import type { PaymentEvents } from '../../domain/transaction/payment-events';
import type { Transaction } from '../../domain/transaction/transaction';

/**
 * PaymentEvents adapter: one `payment.finalized` JSON log line per finished payment. CloudWatch
 * metric filters turn it into PaymentsApproved/Declined/Error (infra/template.yaml). Only
 * non-personal fields: no email, name, address or card data.
 */
export class LogPaymentEvents implements PaymentEvents {
  constructor(private readonly logger = new Logger('Payments')) {}

  finalized(transaction: Transaction): void {
    try {
      this.logger.log({
        event: 'payment.finalized',
        reference: transaction.reference,
        status: transaction.status,
        amountInCents: transaction.amountInCents,
        quantity: transaction.quantity,
        cardBrand: transaction.cardBrand,
        ...(transaction.failureReason
          ? { failureReason: transaction.failureReason }
          : {}),
      });
    } catch {
      // Observability must never break a payment.
    }
  }
}
