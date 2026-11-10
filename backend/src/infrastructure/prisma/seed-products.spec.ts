import {
  SEED_PRODUCTS,
  seedProducts,
  type ProductUpserter,
} from './seed-products';

describe('seedProducts', () => {
  it('AC-001-05 upserts every product by its fixed id without overwriting existing rows (stock is preserved)', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma: ProductUpserter = { product: { upsert } };

    const count = await seedProducts(prisma);

    expect(count).toBe(SEED_PRODUCTS.length);
    expect(upsert).toHaveBeenCalledTimes(SEED_PRODUCTS.length);
    for (const product of SEED_PRODUCTS) {
      expect(upsert).toHaveBeenCalledWith({
        where: { id: product.id },
        update: {},
        create: product,
      });
    }
  });

  it('AC-001-05 seed data has unique ids, positive prices and non-negative stock', () => {
    const ids = SEED_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of SEED_PRODUCTS) {
      expect(Number.isInteger(p.priceInCents) && p.priceInCents > 0).toBe(true);
      expect(Number.isInteger(p.stock) && p.stock >= 0).toBe(true);
    }
  });
});
