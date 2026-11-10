import {
  aProduct,
  InMemoryProductRepository,
} from '../../test/in-memory-product.repository';
import { GetProduct } from './get-product.use-case';

describe('GetProduct', () => {
  it('AC-001-02 returns the product when it exists', async () => {
    const product = aProduct();
    const result = await new GetProduct(
      new InMemoryProductRepository([product]),
    ).execute(product.id);
    expect(result).toEqual({ ok: true, value: product });
  });

  it('AC-001-03 returns a NOT_FOUND domain error when the product does not exist', async () => {
    const result = await new GetProduct(
      new InMemoryProductRepository([aProduct()]),
    ).execute('00000000-0000-4000-8000-000000000000');
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Product 00000000-0000-4000-8000-000000000000 not found',
      },
    });
  });
});
