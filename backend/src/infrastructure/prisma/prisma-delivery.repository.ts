import { Injectable } from '@nestjs/common';
import type { Delivery } from '../../domain/delivery/delivery';
import type { DeliveryRepository } from '../../domain/delivery/delivery.repository';
import { PrismaService } from './prisma.service';
import { toDeliveryDomain } from './prisma-transaction.repository';

@Injectable()
export class PrismaDeliveryRepository implements DeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Delivery | null> {
    const row = await this.prisma.delivery.findUnique({ where: { id } });
    return row ? toDeliveryDomain(row) : null;
  }
}
