import { Injectable } from '@nestjs/common';
import type { Customer, NewCustomer } from '../../domain/customer/customer';
import type {
  CustomerRepository,
  UpsertedCustomer,
} from '../../domain/customer/customer.repository';
import type { Customer as CustomerRow } from '../../generated/prisma/client';
import { PrismaService } from './prisma.service';

const toDomain = (row: CustomerRow): Customer => ({
  id: row.id,
  fullName: row.fullName,
  email: row.email,
  phone: row.phone,
});

/** Adapter: implements the CustomerRepository port with Prisma. */
@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByEmail(data: NewCustomer): Promise<UpsertedCustomer> {
    const existing = await this.prisma.customer.findUnique({
      where: { email: data.email },
    });
    const row = await this.prisma.customer.upsert({
      where: { email: data.email },
      create: data,
      update: { fullName: data.fullName, phone: data.phone },
    });
    return { customer: toDomain(row), created: existing === null };
  }

  async findById(id: string): Promise<Customer | null> {
    const row = await this.prisma.customer.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
}
