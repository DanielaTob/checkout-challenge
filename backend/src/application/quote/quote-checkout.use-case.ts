import type { ProductRepository } from '../../domain/product/product.repository';
import {
  buildQuote,
  type FeesProvider,
  type Quote,
} from '../../domain/quote/quote';
import {
  domainError,
  type DomainError,
} from '../../domain/shared/domain-error';
import { err, type Result } from '../../domain/shared/result';

export class QuoteCheckout {
  constructor(
    private readonly products: ProductRepository,
    private readonly fees: FeesProvider,
  ) {}

  async execute(
    productId: string,
    quantity: number,
  ): Promise<Result<Quote, DomainError>> {
    const product = await this.products.findById(productId);
    if (!product) {
      return err(domainError('NOT_FOUND', `Product ${productId} not found`));
    }
    return buildQuote(product, quantity, this.fees.getFees());
  }
}
