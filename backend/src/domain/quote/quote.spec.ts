import { aProduct } from '../../test/in-memory-product.repository';
import { buildQuote } from './quote';

const fees = { baseFeeInCents: 300000, deliveryFeeInCents: 1000000 };

describe('buildQuote', () => {
  it('AC-003-01 computes subtotal, fixed fees and total in COP', () => {
    const product = aProduct({ priceInCents: 24990000, stock: 5 });
    expect(buildQuote(product, 2, fees)).toEqual({
      ok: true,
      value: {
        productId: product.id,
        quantity: 2,
        unitPriceInCents: 24990000,
        subtotalInCents: 49980000,
        baseFeeInCents: 300000,
        deliveryFeeInCents: 1000000,
        totalInCents: 51280000,
        currency: 'COP',
      },
    });
  });

  it('AC-003-02 returns OUT_OF_STOCK when the quantity exceeds the stock', () => {
    const result = buildQuote(aProduct({ stock: 1 }), 2, fees);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('OUT_OF_STOCK');
  });

  it.each([0, 11, 1.5])(
    'AC-003-03 returns VALIDATION for quantity %p',
    (quantity) => {
      const result = buildQuote(aProduct(), quantity, fees);
      expect(!result.ok && result.error.code).toBe('VALIDATION');
    },
  );
});
