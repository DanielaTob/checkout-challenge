import { Injectable } from '@nestjs/common';
import type { Product } from '../../domain/product/product';
import type { ProductRepository } from '../../domain/product/product.repository';
import type { Product as ProductRow } from '../../generated/prisma/client';
import { PrismaService } from './prisma.service';

const toDomain = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  imageUrl: row.imageUrl,
  priceInCents: row.priceInCents,
  stock: row.stock,
});

/** Adapter: implements the ProductRepository port with Prisma. */
@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
}
