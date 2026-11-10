/** Mirrors QuoteResponseDto from GET /products/:id/quote. */
export interface Quote {
  productId: string;
  quantity: number;
  unitPriceInCents: number;
  subtotalInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalInCents: number;
  currency: string;
}
