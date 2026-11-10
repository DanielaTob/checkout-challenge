import { ok } from '../../domain/shared/result';
import { anInput, checkoutFixture } from '../../test/checkout-fixture';
import { FakeClock, FakePaymentGateway } from '../../test/fake-payment-gateway';
import { PollTransactionStatus } from './poll-transaction-status.use-case';

/** Makes a gateway step take `ms` of virtual time. */
const slow = (clock: FakeClock, ms: number) => () => clock.advance(ms);

describe('POST /transactions time budget (15 s)', () => {
  it('AC-005-14 each gateway call gets min(8 s, time left); if the charge exists but time runs out, it answers PENDING', async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING');
    const acceptance = f.gateway.getAcceptanceTokens.getMockImplementation()!;
    const tokenize = f.gateway.tokenizeCard.getMockImplementation()!;
    const create = f.gateway.createTransaction.getMockImplementation()!;
    f.gateway.getAcceptanceTokens.mockImplementationOnce((o) => {
      slow(f.clock, 6000)();
      return acceptance(o);
    });
    f.gateway.tokenizeCard.mockImplementationOnce((c, o) => {
      slow(f.clock, 6000)();
      return tokenize(c, o);
    });
    f.gateway.createTransaction.mockImplementationOnce((r, o) => {
      slow(f.clock, 2000)();
      return create(r, o);
    });

    const result = await f.createTransaction.execute(anInput());

    expect(f.gateway.getAcceptanceTokens).toHaveBeenCalledWith({
      timeoutMs: 15000,
    });
    expect(f.gateway.tokenizeCard.mock.calls[0][1]).toEqual({
      timeoutMs: 9000,
    });
    expect(f.gateway.createTransaction.mock.calls[0][1]).toEqual({
      timeoutMs: 3000,
    });
    // 1 s left: another 1 s interval no longer fits → no polling, answer PENDING.
    expect(f.gateway.getTransaction).not.toHaveBeenCalled();
    expect(result.ok && result.value).toMatchObject({
      created: true,
      transaction: { status: 'PENDING', gatewayTransactionId: 'gw-TX-1' },
    });
  });

  it('AC-005-14 if the budget is spent before creating the charge: GATEWAY_ERROR, no charge, transaction in ERROR', async () => {
    const f = checkoutFixture(5);
    const tokenize = f.gateway.tokenizeCard.getMockImplementation()!;
    f.gateway.tokenizeCard.mockImplementationOnce((c, o) => {
      slow(f.clock, 15000)();
      return tokenize(c, o);
    });

    const result = await f.createTransaction.execute(anInput());

    expect(!result.ok && result.error).toEqual({
      code: 'GATEWAY_ERROR',
      message: 'The payment gateway is too slow: no charge was made',
    });
    expect(f.gateway.createTransaction).not.toHaveBeenCalled();
    expect(f.transactions.rows[0]).toMatchObject({ status: 'ERROR' });
    expect(f.products.stockOf(f.product.id)).toBe(5);
  });

  it('AC-005-14 polling stops at the deadline and passes the time left to each read', async () => {
    const clock = new FakeClock();
    const gateway = new FakePaymentGateway().answerStatuses('PENDING');
    const deadline = clock.now().getTime() + 3500;
    const result = await new PollTransactionStatus(gateway, clock).execute(
      { id: 'gw-1', status: 'PENDING', statusMessage: null },
      deadline,
    );
    expect(result).toEqual(
      ok({ id: 'gw-1', status: 'PENDING', statusMessage: null }),
    );
    expect(gateway.getTransaction.mock.calls.map((c) => c[1])).toEqual([
      { timeoutMs: 2500 },
      { timeoutMs: 1500 },
      { timeoutMs: 500 },
    ]);
  });
});
