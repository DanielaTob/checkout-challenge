import { err } from '../../domain/shared/result';
import { domainError } from '../../domain/shared/domain-error';
import { anInput, checkoutFixture } from '../../test/checkout-fixture';

const KEY = '00000000-0000-4000-8000-0000000000e1';

describe('Payment business events (spec 010)', () => {
  it('AC-010-08 APPROVED: one payment.finalized with the final transaction', async () => {
    const f = checkoutFixture(5);
    await f.createTransaction.execute(anInput());
    expect(f.finalized).toHaveLength(1);
    expect(f.finalized[0]).toMatchObject({
      reference: 'TX-1',
      status: 'APPROVED',
    });
  });

  it('AC-010-08 DECLINED: one event with status DECLINED', async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING', 'DECLINED');
    await f.createTransaction.execute(anInput());
    expect(f.finalized.map((t) => t.status)).toEqual(['DECLINED']);
  });

  it.each([
    'getAcceptanceTokens',
    'tokenizeCard',
    'createTransaction',
  ] as const)(
    'AC-010-08 a gateway failure in %s ends in ERROR and is reported once',
    async (step) => {
      const f = checkoutFixture(5);
      f.gateway[step].mockResolvedValueOnce(
        err(domainError('GATEWAY_ERROR', 'Payment gateway error (HTTP 503)')),
      );
      await f.createTransaction.execute(anInput());
      expect(f.finalized).toHaveLength(1);
      expect(f.finalized[0]).toMatchObject({
        status: 'ERROR',
        failureReason: 'Payment gateway error (HTTP 503)',
      });
    },
  );

  it('AC-010-08 APPROVED by the gateway but out of stock in the race: the event carries the real ERROR', async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING');
    const created = await f.createTransaction.execute(anInput());
    if (!created.ok) throw new Error('setup failed');
    f.products.setStock(f.product.id, 1);
    await f.apply.execute(created.value.transaction, {
      id: 'gw-TX-1',
      status: 'APPROVED',
      statusMessage: null,
    });
    expect(f.finalized).toHaveLength(1);
    expect(f.finalized[0]).toMatchObject({
      status: 'ERROR',
      failureReason: 'OUT_OF_STOCK_AFTER_PAYMENT',
    });
  });

  it('AC-010-08 nothing is reported while the payment is still PENDING', async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING');
    await f.createTransaction.execute(anInput());
    expect(f.finalized).toHaveLength(0);
  });

  it('AC-010-09 applying the same final status twice (concurrent poll and reload) reports it once', async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING');
    const created = await f.createTransaction.execute(anInput());
    if (!created.ok) throw new Error('setup failed');
    const approved = {
      id: 'gw-TX-1',
      status: 'APPROVED' as const,
      statusMessage: null,
    };
    // Both callers still hold the PENDING snapshot.
    await Promise.all([
      f.apply.execute(created.value.transaction, approved),
      f.apply.execute(created.value.transaction, approved),
    ]);
    expect(f.finalized).toHaveLength(1);
  });

  it('AC-010-09 re-reading a final transaction (GET by id, by key, replay with the same key) emits nothing new', async () => {
    const f = checkoutFixture(5);
    const first = await f.createTransaction.execute(
      anInput({ idempotencyKey: KEY }),
    );
    if (!first.ok) throw new Error('setup failed');
    expect(f.finalized).toHaveLength(1);

    await f.refresh.execute(first.value.transaction);
    await f.createTransaction.execute(anInput({ idempotencyKey: KEY }));
    const stored = await f.transactions.findById(first.value.transaction.id);
    await f.refresh.execute(stored!);

    expect(f.finalized).toHaveLength(1);
  });

  it('AC-010-09 a PENDING transaction finalized later by a GET is reported exactly once', async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING');
    const created = await f.createTransaction.execute(anInput());
    if (!created.ok) throw new Error('setup failed');
    f.gateway.answerStatuses('APPROVED');
    const refreshed = await f.refresh.execute(created.value.transaction);
    if (!refreshed.ok) throw new Error('refresh failed');
    await f.refresh.execute(refreshed.value);
    expect(f.finalized.map((t) => t.status)).toEqual(['APPROVED']);
  });
});
