import { domainError } from '../../domain/shared/domain-error';
import { err } from '../../domain/shared/result';
import { anInput, checkoutFixture } from '../../test/checkout-fixture';
import { GetTransaction } from './get-transaction.use-case';
import { RefreshTransaction } from './refresh-transaction.use-case';

const setup = async (statuses: Array<'PENDING' | 'APPROVED'>) => {
  const f = checkoutFixture(5);
  f.gateway.answerStatuses(...statuses);
  const created = await f.createTransaction.execute(anInput());
  if (!created.ok) throw new Error('setup failed');
  const getTransaction = new GetTransaction(
    f.transactions,
    new RefreshTransaction(f.gateway, f.apply),
  );
  return { f, tx: created.value.transaction, getTransaction };
};

describe('GetTransaction', () => {
  it('AC-004-14 a PENDING transaction is re-read at the gateway and the result applied', async () => {
    const { f, tx, getTransaction } = await setup(['PENDING']);
    f.gateway.answerStatuses('APPROVED');
    const result = await getTransaction.execute(tx.id);
    expect(result.ok && result.value).toMatchObject({
      status: 'APPROVED',
      delivery: { status: 'PENDING' },
    });
    expect(f.products.stockOf(f.product.id)).toBe(3);
  });

  it('AC-004-14 a final transaction is returned without calling the gateway', async () => {
    const { f, tx, getTransaction } = await setup(['APPROVED']);
    f.gateway.getTransaction.mockClear();
    const result = await getTransaction.execute(tx.id);
    expect(result.ok && result.value.status).toBe('APPROVED');
    expect(f.gateway.getTransaction).not.toHaveBeenCalled();
  });

  it('AC-004-14 a PENDING transaction never sent to the gateway is returned as is', async () => {
    const { f, tx, getTransaction } = await setup(['PENDING']);
    f.transactions.rows[0] = { ...tx, gatewayTransactionId: null };
    f.gateway.getTransaction.mockClear();
    const result = await getTransaction.execute(tx.id);
    expect(result.ok && result.value.status).toBe('PENDING');
    expect(f.gateway.getTransaction).not.toHaveBeenCalled();
  });

  it('AC-004-14 unknown id → NOT_FOUND; gateway failure while refreshing → GATEWAY_ERROR', async () => {
    const { f, tx, getTransaction } = await setup(['PENDING']);
    const missing = await getTransaction.execute(
      '00000000-0000-4000-8000-000000000000',
    );
    expect(!missing.ok && missing.error.code).toBe('NOT_FOUND');
    f.gateway.getTransaction.mockResolvedValueOnce(
      err(domainError('GATEWAY_ERROR', 'down')),
    );
    const failed = await getTransaction.execute(tx.id);
    expect(!failed.ok && failed.error.code).toBe('GATEWAY_ERROR');
  });
});
