import type { PrismaService } from './prisma.service';
import { PrismaDeliveryRepository } from './prisma-delivery.repository';

describe('PrismaDeliveryRepository', () => {
  it('AC-004-15 findById maps the row (without timestamps) or returns null', async () => {
    const row = {
      id: '9c1d2c3a-0000-4000-8000-000000000001',
      transactionId: '8b1d2c3a-0000-4000-8000-000000000001',
      customerId: '7a1d2c3a-0000-4000-8000-000000000001',
      address: 'Calle 1 # 2-3',
      city: 'Bogotá',
      region: 'Cundinamarca',
      postalCode: '110111',
      status: 'PENDING',
      createdAt: new Date(),
    };
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(null);
    const repo = new PrismaDeliveryRepository({
      delivery: { findUnique },
    } as unknown as PrismaService);
    const { createdAt: _c, ...domain } = row;
    void _c;
    await expect(repo.findById(row.id)).resolves.toEqual(domain);
    await expect(repo.findById(row.id)).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledWith({ where: { id: row.id } });
  });
});
