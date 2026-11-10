import { anInput, checkoutFixture } from '../../test/checkout-fixture';
import { GetDelivery } from './get-delivery.use-case';

describe('GetDelivery', () => {
  it('AC-004-15 returns the delivery of an approved transaction, NOT_FOUND otherwise', async () => {
    const f = checkoutFixture();
    const created = await f.createTransaction.execute(anInput());
    const delivery = created.ok ? created.value.transaction.delivery : null;
    const useCase = new GetDelivery(f.transactions.deliveries);

    await expect(useCase.execute(delivery!.id)).resolves.toEqual({
      ok: true,
      value: delivery,
    });
    const missing = await useCase.execute(
      '00000000-0000-4000-8000-000000000000',
    );
    expect(!missing.ok && missing.error.code).toBe('NOT_FOUND');
  });
});
