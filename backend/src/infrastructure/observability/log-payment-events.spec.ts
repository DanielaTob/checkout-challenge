import type { Logger } from '@nestjs/common';
import type { Transaction } from '../../domain/transaction/transaction';
import { LogPaymentEvents } from './log-payment-events';

const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'id-1',
  reference: 'TX-1',
  productId: 'p',
  customerId: 'c',
  quantity: 2,
  amountInCents: 51280000,
  baseFeeInCents: 300000,
  deliveryFeeInCents: 1000000,
  status: 'APPROVED',
  gatewayTransactionId: 'gw-1',
  cardBrand: 'VISA',
  cardLast4: '4242',
  idempotencyKey: 'k',
  shipping: {
    address: 'Calle 1 # 2-3',
    city: 'Bogotá',
    region: 'Cundinamarca',
    postalCode: '110111',
  },
  failureReason: null,
  delivery: null,
  createdAt: new Date(),
  ...overrides,
});

describe('LogPaymentEvents (spec 010)', () => {
  it('AC-010-08 logs payment.finalized with reference, status, amount and brand — no personal or card data', () => {
    const log = jest.fn();
    new LogPaymentEvents({ log } as unknown as Logger).finalized(tx());
    expect(log).toHaveBeenCalledWith({
      event: 'payment.finalized',
      reference: 'TX-1',
      status: 'APPROVED',
      amountInCents: 51280000,
      quantity: 2,
      cardBrand: 'VISA',
    });
    const text = JSON.stringify(log.mock.calls);
    for (const pii of ['4242', 'Calle', 'Bogotá', 'gw-1', 'customer']) {
      expect(text).not.toContain(pii);
    }
  });

  it('AC-010-08 includes the failure reason for DECLINED/ERROR', () => {
    const log = jest.fn();
    new LogPaymentEvents({ log } as unknown as Logger).finalized(
      tx({ status: 'ERROR', failureReason: 'OUT_OF_STOCK_AFTER_PAYMENT' }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERROR',
        failureReason: 'OUT_OF_STOCK_AFTER_PAYMENT',
      }),
    );
  });

  it('AC-010-08 never throws, even if logging fails', () => {
    const log = jest.fn(() => {
      throw new Error('stdout closed');
    });
    expect(() =>
      new LogPaymentEvents({ log } as unknown as Logger).finalized(tx()),
    ).not.toThrow();
  });

  it('AC-010-08 uses a Nest Logger with the Payments context by default', () => {
    expect(() => new LogPaymentEvents().finalized(tx())).not.toThrow();
  });
});
