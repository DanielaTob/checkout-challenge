import type { Delivery } from './delivery';

export interface DeliveryRepository {
  findById(id: string): Promise<Delivery | null>;
}

export const DELIVERY_REPOSITORY = Symbol('DeliveryRepository');
