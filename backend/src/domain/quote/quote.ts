import type { Product } from '../product/product';
import { domainError, type DomainError } from '../shared/domain-error';
import { err, ok, type Result } from '../shared/result';

export const CURRENCY = 'COP';
export const MAX_QUANTITY = 10;

export interface Fees {
  readonly baseFeeInCents: number;
  readonly deliveryFeeInCents: number;
}

/** Port: where the fixed fees come from (environment in production). */
export interface FeesProvider {
  getFees(): Fees;
}

export const FEES_PROVIDER = Symbol('FeesProvider');

export interface Quote {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPriceInCents: number;
  readonly subtotalInCents: number;
  readonly baseFeeInCents: number;
  readonly deliveryFeeInCents: number;
  readonly totalInCents: number;
  readonly currency: typeof CURRENCY;
}

/** Pure: the backend is the only source of truth for amounts. */
export const buildQuote = (
  product: Product,
  quantity: number,
  fees: Fees,
): Result<Quote, DomainError> => {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return err(
      domainError(
        'VALIDATION',
        `quantity must be an integer between 1 and ${MAX_QUANTITY}`,
      ),
    );
  }
  if (quantity > product.stock) {
    return err(
      domainError(
        'OUT_OF_STOCK',
        `Only ${product.stock} unit(s) of product ${product.id} left`,
      ),
    );
  }
  const subtotalInCents = product.priceInCents * quantity;
  return ok({
    productId: product.id,
    quantity,
    unitPriceInCents: product.priceInCents,
    subtotalInCents,
    baseFeeInCents: fees.baseFeeInCents,
    deliveryFeeInCents: fees.deliveryFeeInCents,
    totalInCents:
      subtotalInCents + fees.baseFeeInCents + fees.deliveryFeeInCents,
    currency: CURRENCY,
  });
};
