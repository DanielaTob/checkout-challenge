import { domainError } from '../../domain/shared/domain-error';
import { err } from '../../domain/shared/result';
import { anInput, checkoutFixture } from '../../test/checkout-fixture';

const KEY = '00000000-0000-4000-8000-0000000000b1';

describe('CreateTransaction idempotency', () => {
  it('AC-005-09 the same Idempotency-Key returns the same transaction without calling the gateway again', async () => {
    const f = checkoutFixture(5);
    const first = await f.createTransaction.execute(
      anInput({ idempotencyKey: KEY }),
    );
    const callsAfterFirst = f.gateway.createTransaction.mock.calls.length;
    const second = await f.createTransaction.execute(
      anInput({ idempotencyKey: KEY }),
    );

    expect(first.ok && first.value.created).toBe(true);
    expect(second.ok && second.value.created).toBe(false);
    expect(second.ok && second.value.transaction.id).toBe(
      first.ok && first.value.transaction.id,
    );
    expect(f.gateway.createTransaction).toHaveBeenCalledTimes(callsAfterFirst);
    expect(f.gateway.tokenizeCard).toHaveBeenCalledTimes(1);
    expect(f.transactions.rows).toHaveLength(1);
    expect(f.products.stockOf(f.product.id)).toBe(3);
  });

  it('AC-005-09 a replay of a PENDING transaction is refreshed from the gateway (updated)', async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING');
    await f.createTransaction.execute(anInput({ idempotencyKey: KEY }));
    f.gateway.answerStatuses('APPROVED');
    const replay = await f.createTransaction.execute(
      anInput({ idempotencyKey: KEY }),
    );
    expect(replay.ok && replay.value.transaction.status).toBe('APPROVED');
    expect(f.gateway.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('AC-005-09 if the refresh fails the stored transaction is returned as is', async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING');
    await f.createTransaction.execute(anInput({ idempotencyKey: KEY }));
    f.gateway.getTransaction.mockResolvedValue(
      err(domainError('GATEWAY_ERROR', 'down')),
    );
    const replay = await f.createTransaction.execute(
      anInput({ idempotencyKey: KEY }),
    );
    expect(replay.ok && replay.value).toMatchObject({
      created: false,
      transaction: { status: 'PENDING' },
    });
  });

  it.each([
    ['another quantity', { quantity: 1 }],
    ['another product', { productId: '00000000-0000-4000-8000-000000000009' }],
    [
      'another customer',
      { customerId: '00000000-0000-4000-8000-000000000009' },
    ],
  ])(
    'AC-005-10 the same Idempotency-Key with %s → CONFLICT',
    async (_, change) => {
      const f = checkoutFixture(5);
      await f.createTransaction.execute(anInput({ idempotencyKey: KEY }));
      const result = await f.createTransaction.execute(
        anInput({ idempotencyKey: KEY, ...change }),
      );
      expect(!result.ok && result.error.code).toBe('CONFLICT');
      expect(f.gateway.createTransaction).toHaveBeenCalledTimes(1);
    },
  );

  it('AC-005-09 two concurrent requests with the same key: the loser of the insert race replays the winner', async () => {
    const f = checkoutFixture(5);
    const winner = await f.createTransaction.execute(
      anInput({ idempotencyKey: KEY }),
    );
    // Simulate: the lookup ran before the winner committed, the insert then hits the unique key.
    jest
      .spyOn(f.transactions, 'findByIdempotencyKey')
      .mockResolvedValueOnce(null);
    const loser = await f.createTransaction.execute(
      anInput({ idempotencyKey: KEY }),
    );
    expect(loser.ok && loser.value).toMatchObject({
      created: false,
      transaction: { id: winner.ok && winner.value.transaction.id },
    });
    expect(f.gateway.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('AC-005-10 a CONFLICT without key (reference clash) is returned as is', async () => {
    const f = checkoutFixture(5);
    jest
      .spyOn(f.transactions, 'createPendingIfStock')
      .mockResolvedValueOnce(err(domainError('CONFLICT', 'reference used')));
    const result = await f.createTransaction.execute(anInput());
    expect(!result.ok && result.error.code).toBe('CONFLICT');
  });
});
