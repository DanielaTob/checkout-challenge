import { anInput, checkoutFixture } from '../../test/checkout-fixture';
import { GetTransactionByKey } from './get-transaction-by-key.use-case';

const KEY = '00000000-0000-4000-8000-0000000000d1';

describe('GetTransactionByKey', () => {
  it('AC-005-13 returns the (refreshed) transaction for a known key and NOT_FOUND otherwise', async () => {
    const f = checkoutFixture();
    f.gateway.answerStatuses('PENDING');
    await f.createTransaction.execute(anInput({ idempotencyKey: KEY }));
    f.gateway.answerStatuses('APPROVED');
    const useCase = new GetTransactionByKey(f.transactions, f.refresh);

    const found = await useCase.execute(KEY);
    expect(found.ok && found.value).toMatchObject({
      idempotencyKey: KEY,
      status: 'APPROVED',
    });
    const missing = await useCase.execute(
      '00000000-0000-4000-8000-0000000000d2',
    );
    expect(!missing.ok && missing.error.code).toBe('NOT_FOUND');
  });
});
