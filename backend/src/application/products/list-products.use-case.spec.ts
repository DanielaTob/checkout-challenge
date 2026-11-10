import {
  aProduct,
  InMemoryProductRepository,
} from '../../test/in-memory-product.repository';
import { ListProducts } from './list-products.use-case';

describe('ListProducts', () => {
  it('AC-001-01 returns every product with its stock on the success track', async () => {
    const products = [
      aProduct(),
      aProduct({ id: '6f1d2c3a-0000-4000-8000-000000000002', stock: 0 }),
    ];
    const result = await new ListProducts(
      new InMemoryProductRepository(products),
    ).execute();
    expect(result).toEqual({ ok: true, value: products });
  });

  it('AC-001-01 returns an empty list (not an error) when there are no products', async () => {
    const result = await new ListProducts(
      new InMemoryProductRepository(),
    ).execute();
    expect(result).toEqual({ ok: true, value: [] });
  });
});
