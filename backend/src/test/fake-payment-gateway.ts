import type { CardInput } from '../domain/payment/card';
import type {
  AcceptanceTokens,
  CardToken,
  GatewayCallOptions,
  GatewayPaymentRequest,
  GatewayTransaction,
  PaymentGateway,
} from '../domain/payment/payment-gateway';
import type { Clock } from '../domain/shared/clock';
import type { DomainError } from '../domain/shared/domain-error';
import { ok, type Result } from '../domain/shared/result';
import type { TransactionStatus } from '../domain/transaction/transaction-status';

type R<T> = Promise<Result<T, DomainError>>;

/** Scriptable PaymentGateway double: every method is a jest.fn with a happy default. */
export class FakePaymentGateway implements PaymentGateway {
  readonly getAcceptanceTokens = jest.fn<
    R<AcceptanceTokens>,
    [GatewayCallOptions?]
  >(() =>
    Promise.resolve(
      ok({ acceptanceToken: 'acc', personalDataAuthToken: 'pers' }),
    ),
  );
  readonly tokenizeCard = jest.fn<
    R<CardToken>,
    [CardInput, GatewayCallOptions?]
  >((card) => Promise.resolve(ok({ id: `tok_${card.number.slice(-4)}` })));
  readonly createTransaction = jest.fn<
    R<GatewayTransaction>,
    [GatewayPaymentRequest, GatewayCallOptions?]
  >((req) =>
    Promise.resolve(
      ok({ id: `gw-${req.reference}`, status: 'PENDING', statusMessage: null }),
    ),
  );
  readonly getTransaction = jest.fn<
    R<GatewayTransaction>,
    [string, GatewayCallOptions?]
  >((id) =>
    Promise.resolve(ok({ id, status: 'APPROVED', statusMessage: null })),
  );

  /** The next status reads answer these statuses, in order (the last one repeats). */
  answerStatuses(...statuses: TransactionStatus[]): this {
    let i = 0;
    this.getTransaction.mockImplementation((id: string) => {
      const status = statuses[Math.min(i++, statuses.length - 1)];
      return Promise.resolve(
        ok({
          id,
          status,
          statusMessage: status === 'DECLINED' ? 'Rechazada' : null,
        }),
      );
    });
    return this;
  }
}

/** Virtual time: sleep() and advance() move now() forward instantly. */
export class FakeClock implements Clock {
  readonly sleeps: number[] = [];
  private time: number;
  constructor(start = new Date('2026-11-10T12:00:00Z')) {
    this.time = start.getTime();
  }
  now(): Date {
    return new Date(this.time);
  }
  advance(ms: number): void {
    this.time += ms;
  }
  sleep(ms: number): Promise<void> {
    this.sleeps.push(ms);
    this.advance(ms);
    return Promise.resolve();
  }
}
