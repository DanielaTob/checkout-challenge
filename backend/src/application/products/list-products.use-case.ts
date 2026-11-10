import type { Product } from '../../domain/product/product';
import type { ProductRepository } from '../../domain/product/product.repository';
import type { DomainError } from '../../domain/shared/domain-error';
import { ok, type Result } from '../../domain/shared/result';

export class ListProducts {
  constructor(private readonly products: ProductRepository) {}

  async execute(): Promise<Result<Product[], DomainError>> {
    return ok(await this.products.findAll());
  }
}
