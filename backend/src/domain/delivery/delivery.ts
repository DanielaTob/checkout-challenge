export type DeliveryStatus = 'PENDING' | 'DISPATCHED' | 'DELIVERED';

export interface Shipping {
  readonly address: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
}

export interface Delivery extends Shipping {
  readonly id: string;
  readonly transactionId: string;
  readonly customerId: string;
  readonly status: DeliveryStatus;
}
