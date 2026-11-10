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

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';

/** Subset of TransactionResponseDto the front uses. */
export interface Transaction {
  id: string;
  reference: string;
  status: TransactionStatus;
  totalInCents: number;
  cardBrand: string | null;
  cardLast4: string | null;
  failureReason: string | null;
}
