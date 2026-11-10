export interface Product {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly priceInCents: number;
  readonly stock: number;
}
