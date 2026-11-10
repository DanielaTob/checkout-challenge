import type { PrismaService } from './prisma.service';
import { PrismaProductRepository } from './prisma-product.repository';

const row = {
  id: '6f1d2c3a-0000-4000-8000-000000000001',
  name: 'Audífonos inalámbricos',
  description: 'Over-ear',
  imageUrl: '/images/headphones.webp',
  priceInCents: 24990000,
  stock: 10,
  createdAt: new Date('2026-11-10T00:00:00Z'),
  updatedAt: new Date('2026-11-10T00:00:00Z'),
};
const domain = {
  id: row.id,
  name: row.name,
  description: row.description,
  imageUrl: row.imageUrl,
  priceInCents: row.priceInCents,
  stock: row.stock,
};

const makeRepo = () => {
  const findMany = jest.fn().mockResolvedValue([row]);
  const findUnique = jest.fn();
  const prisma = {
    product: { findMany, findUnique },
  } as unknown as PrismaService;
  return { repo: new PrismaProductRepository(prisma), findMany, findUnique };
};

describe('PrismaProductRepository', () => {
  it('AC-001-01 findAll maps rows to domain products ordered by name, without timestamps', async () => {
    const { repo, findMany } = makeRepo();
    await expect(repo.findAll()).resolves.toEqual([domain]);
    expect(findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('AC-001-02 findById maps the row to a domain product', async () => {
    const { repo, findUnique } = makeRepo();
    findUnique.mockResolvedValue(row);
    await expect(repo.findById(row.id)).resolves.toEqual(domain);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: row.id } });
  });

  it('AC-001-03 findById returns null when the row does not exist', async () => {
    const { repo, findUnique } = makeRepo();
    findUnique.mockResolvedValue(null);
    await expect(repo.findById(row.id)).resolves.toBeNull();
  });
});
