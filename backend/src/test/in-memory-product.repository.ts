import type { Product } from '../domain/product/product';
import type { ProductRepository } from '../domain/product/product.repository';

/** Test double for the ProductRepository port. */
export class InMemoryProductRepository implements ProductRepository {
  readonly calls = { findAll: 0, findById: 0 };

  constructor(private readonly products: Product[] = []) {}

  findAll(): Promise<Product[]> {
    this.calls.findAll++;
    return Promise.resolve([...this.products]);
  }

  findById(id: string): Promise<Product | null> {
    this.calls.findById++;
    return Promise.resolve(this.products.find((p) => p.id === id) ?? null);
  }

  stockOf(id: string): number | undefined {
    return this.products.find((p) => p.id === id)?.stock;
  }

  /** Test-only: sets the stock of a product. */
  setStock(id: string, stock: number): void {
    const index = this.products.findIndex((p) => p.id === id);
    this.products[index] = { ...this.products[index], stock };
  }
}

export const aProduct = (overrides: Partial<Product> = {}): Product => ({
  id: '6f1d2c3a-0000-4000-8000-000000000001',
  name: 'Audífonos inalámbricos',
  description: 'Over-ear',
  imageUrl: '/images/headphones.webp',
  priceInCents: 24990000,
  stock: 10,
  ...overrides,
});
