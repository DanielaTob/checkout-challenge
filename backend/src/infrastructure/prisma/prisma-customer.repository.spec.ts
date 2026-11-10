import type { PrismaService } from './prisma.service';
import { PrismaCustomerRepository } from './prisma-customer.repository';

const row = {
  id: '7a1d2c3a-0000-4000-8000-000000000001',
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+573001234567',
  createdAt: new Date('2026-11-10T00:00:00Z'),
};
const domain = {
  id: row.id,
  fullName: row.fullName,
  email: row.email,
  phone: row.phone,
};

const makeRepo = () => {
  const customer = {
    findUnique: jest.fn(),
    upsert: jest.fn().mockResolvedValue(row),
  };
  const prisma = { customer } as unknown as PrismaService;
  return { repo: new PrismaCustomerRepository(prisma), customer };
};

describe('PrismaCustomerRepository', () => {
  it('AC-004-01 upsertByEmail inserts and reports created when the email is new', async () => {
    const { repo, customer } = makeRepo();
    customer.findUnique.mockResolvedValue(null);
    await expect(
      repo.upsertByEmail({
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
      }),
    ).resolves.toEqual({ customer: domain, created: true });
    expect(customer.upsert).toHaveBeenCalledWith({
      where: { email: row.email },
      create: { fullName: row.fullName, email: row.email, phone: row.phone },
      update: { fullName: row.fullName, phone: row.phone },
    });
  });

  it('AC-004-01 upsertByEmail reports not created when the email already existed', async () => {
    const { repo, customer } = makeRepo();
    customer.findUnique.mockResolvedValue(row);
    const result = await repo.upsertByEmail(domain);
    expect(result.created).toBe(false);
  });

  it('findById maps the row or returns null', async () => {
    const { repo, customer } = makeRepo();
    customer.findUnique.mockResolvedValueOnce(row).mockResolvedValueOnce(null);
    await expect(repo.findById(row.id)).resolves.toEqual(domain);
    await expect(repo.findById(row.id)).resolves.toBeNull();
  });
});
