import type { Delivery } from '../../domain/delivery/delivery';
import type { DeliveryRepository } from '../../domain/delivery/delivery.repository';
import {
  domainError,
  type DomainError,
} from '../../domain/shared/domain-error';
import { err, ok, type Result } from '../../domain/shared/result';

export class GetDelivery {
  constructor(private readonly deliveries: DeliveryRepository) {}

  async execute(id: string): Promise<Result<Delivery, DomainError>> {
    const delivery = await this.deliveries.findById(id);
    return delivery
      ? ok(delivery)
      : err(domainError('NOT_FOUND', `Delivery ${id} not found`));
  }
}
