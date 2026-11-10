import type { Product } from '../../domain/product/product';
import type { ProductRepository } from '../../domain/product/product.repository';
import {
  domainError,
  type DomainError,
} from '../../domain/shared/domain-error';
import { err, ok, type Result } from '../../domain/shared/result';

export class GetProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<Result<Product, DomainError>> {
    const product = await this.products.findById(id);
    return product
      ? ok(product)
      : err(domainError('NOT_FOUND', `Product ${id} not found`));
  }
}
