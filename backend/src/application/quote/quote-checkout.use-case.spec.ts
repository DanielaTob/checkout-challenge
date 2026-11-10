import {
  aProduct,
  InMemoryProductRepository,
} from '../../test/in-memory-product.repository';
import { QuoteCheckout } from './quote-checkout.use-case';

const fees = {
  getFees: () => ({ baseFeeInCents: 100, deliveryFeeInCents: 200 }),
};

describe('QuoteCheckout', () => {
  const product = aProduct({ priceInCents: 1000, stock: 3 });
  const useCase = new QuoteCheckout(
    new InMemoryProductRepository([product]),
    fees,
  );

  it('AC-003-01 returns the quote for an existing product', async () => {
    const result = await useCase.execute(product.id, 2);
    expect(result.ok && result.value.totalInCents).toBe(2300);
  });

  it('AC-003-02 returns OUT_OF_STOCK when quantity exceeds stock', async () => {
    const result = await useCase.execute(product.id, 4);
    expect(!result.ok && result.error.code).toBe('OUT_OF_STOCK');
  });

  it('AC-003-03 returns NOT_FOUND for an unknown product', async () => {
    const result = await useCase.execute(
      '00000000-0000-4000-8000-000000000000',
      1,
    );
    expect(!result.ok && result.error.code).toBe('NOT_FOUND');
  });
});
