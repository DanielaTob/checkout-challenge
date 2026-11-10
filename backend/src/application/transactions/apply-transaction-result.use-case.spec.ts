import { anInput, checkoutFixture } from '../../test/checkout-fixture';

describe('ApplyTransactionResult', () => {
  const setup = async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING');
    const created = await f.createTransaction.execute(anInput());
    if (!created.ok) throw new Error('setup failed');
    return { f, tx: created.value.transaction };
  };

  it('AC-004-11 applying APPROVED twice decrements stock once and creates one delivery', async () => {
    const { f, tx } = await setup();
    const approved = {
      id: 'gw-TX-1',
      status: 'APPROVED' as const,
      statusMessage: null,
    };
    const first = await f.apply.execute(tx, approved);
    await f.apply.execute(tx, approved);
    expect(first.ok && first.value.status).toBe('APPROVED');
    expect(f.products.stockOf(f.product.id)).toBe(3);
    expect(
      f.transactions.log.filter((l) => l === 'applyResult:APPROVED'),
    ).toHaveLength(2);
    expect(f.transactions.rows[0].delivery).not.toBeNull();
  });

  it('AC-004-11 does nothing when the gateway is still PENDING or the transaction is already final', async () => {
    const { f, tx } = await setup();
    const stillPending = await f.apply.execute(tx, {
      id: 'gw',
      status: 'PENDING',
      statusMessage: null,
    });
    expect(stillPending).toEqual({ ok: true, value: tx });
    const final = { ...tx, status: 'DECLINED' as const };
    const again = await f.apply.execute(final, {
      id: 'gw',
      status: 'APPROVED',
      statusMessage: null,
    });
    expect(again).toEqual({ ok: true, value: final });
    expect(f.transactions.log).not.toContain('applyResult:APPROVED');
  });

  it('AC-004-12 the stock ran out while paying: ERROR with OUT_OF_STOCK_AFTER_PAYMENT and stock stays at 0', async () => {
    const { f, tx } = await setup();
    f.products.setStock(f.product.id, 1);
    const result = await f.apply.execute(tx, {
      id: 'gw-TX-1',
      status: 'APPROVED',
      statusMessage: null,
    });
    expect(result.ok && result.value).toMatchObject({
      status: 'ERROR',
      failureReason: 'OUT_OF_STOCK_AFTER_PAYMENT',
      delivery: null,
    });
    expect(f.products.stockOf(f.product.id)).toBe(1);
  });

  it('AC-004-10 uses the gateway status as reason when there is no message', async () => {
    const { f, tx } = await setup();
    const result = await f.apply.execute(tx, {
      id: 'gw-TX-1',
      status: 'ERROR',
      statusMessage: null,
    });
    expect(result.ok && result.value.failureReason).toBe('ERROR');
  });
});
