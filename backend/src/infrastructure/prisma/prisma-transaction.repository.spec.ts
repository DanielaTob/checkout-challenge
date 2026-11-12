import type { NewTransaction } from '../../domain/transaction/transaction';
import type { PrismaService } from './prisma.service';
import {
  parseShipping,
  PrismaTransactionRepository,
} from './prisma-transaction.repository';

const productId = '6f1d2c3a-0000-4000-8000-000000000001';
const shipping = {
  address: 'Calle 1 # 2-3',
  city: 'Bogotá',
  region: 'Cundinamarca',
  postalCode: '110111',
};
const newTx: NewTransaction = {
  reference: 'ref-1',
  productId,
  customerId: '7a1d2c3a-0000-4000-8000-000000000001',
  quantity: 2,
  amountInCents: 51280000,
  baseFeeInCents: 300000,
  deliveryFeeInCents: 1000000,
  cardBrand: 'VISA',
  cardLast4: '4242',
  idempotencyKey: '00000000-0000-4000-8000-00000000000a',
  shipping,
};
const createdAt = new Date('2026-11-10T00:00:00Z');
const aRow = (overrides: Record<string, unknown> = {}) => ({
  id: '8b1d2c3a-0000-4000-8000-000000000001',
  ...newTx,
  status: 'PENDING',
  gatewayTransactionId: null,
  failureReason: null,
  delivery: null,
  createdAt,
  updatedAt: createdAt,
  ...overrides,
});

const makePrisma = () => {
  const tx = {
    $queryRaw: jest.fn(),
    transaction: {
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    product: { updateMany: jest.fn() },
    delivery: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    transaction: { findUnique: jest.fn(), update: jest.fn() },
  };
  return {
    tx,
    prisma,
    repo: new PrismaTransactionRepository(prisma as unknown as PrismaService),
  };
};

const sqlOf = (mock: jest.Mock) =>
  (mock.mock.calls[0] as [TemplateStringsArray, ...unknown[]])[0].join('?');

describe('PrismaTransactionRepository.createPendingIfStock', () => {
  it('AC-004-21 locks the product row with SELECT … FOR UPDATE inside the DB transaction and inserts PENDING when stock suffices', async () => {
    const { tx, prisma, repo } = makePrisma();
    tx.$queryRaw.mockResolvedValue([{ stock: 2 }]);
    tx.transaction.create.mockResolvedValue(aRow());
    const result = await repo.createPendingIfStock(newTx);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(sqlOf(tx.$queryRaw)).toMatch(
      /SELECT stock FROM products WHERE id = \?::uuid FOR UPDATE/,
    );
    expect(tx.$queryRaw.mock.calls[0]).toContain(productId);
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: { ...newTx, status: 'PENDING' },
      include: { delivery: true },
    });
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        status: 'PENDING',
        reference: 'ref-1',
        shipping,
        delivery: null,
        cardBrand: 'VISA',
        cardLast4: '4242',
      }) as unknown,
    });
  });

  it('AC-004-03 AC-004-21 returns OUT_OF_STOCK without inserting anything when quantity > stock', async () => {
    const { tx, repo } = makePrisma();
    tx.$queryRaw.mockResolvedValue([{ stock: 1 }]);
    const result = await repo.createPendingIfStock(newTx);
    expect(!result.ok && result.error.code).toBe('OUT_OF_STOCK');
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('AC-004-04 returns NOT_FOUND when the product row does not exist', async () => {
    const { tx, repo } = makePrisma();
    tx.$queryRaw.mockResolvedValue([]);
    const result = await repo.createPendingIfStock(newTx);
    expect(!result.ok && result.error.code).toBe('NOT_FOUND');
  });

  it('AC-005-10 maps a unique violation (key already used concurrently) to CONFLICT and rethrows other errors', async () => {
    const { tx, repo } = makePrisma();
    tx.$queryRaw.mockResolvedValue([{ stock: 5 }]);
    tx.transaction.create.mockRejectedValueOnce({ code: 'P2002' });
    const conflict = await repo.createPendingIfStock(newTx);
    expect(!conflict.ok && conflict.error.code).toBe('CONFLICT');

    tx.transaction.create.mockRejectedValueOnce(new Error('db down'));
    await expect(repo.createPendingIfStock(newTx)).rejects.toThrow('db down');
  });
});

describe('PrismaTransactionRepository reads', () => {
  it('AC-004-14 findById maps the row with its delivery, or returns null', async () => {
    const { prisma, repo } = makePrisma();
    const delivery = {
      id: '9c1d2c3a-0000-4000-8000-000000000001',
      transactionId: aRow().id,
      customerId: newTx.customerId,
      ...shipping,
      status: 'PENDING',
      createdAt,
    };
    prisma.transaction.findUnique
      .mockResolvedValueOnce(aRow({ status: 'APPROVED', delivery }))
      .mockResolvedValueOnce(null);
    const found = await repo.findById(aRow().id);
    expect(found?.delivery).toEqual({
      id: delivery.id,
      transactionId: delivery.transactionId,
      customerId: delivery.customerId,
      ...shipping,
      status: 'PENDING',
    });
    await expect(repo.findById('x')).resolves.toBeNull();
  });

  it('AC-005-13 findByIdempotencyKey looks the row up by its unique key', async () => {
    const { prisma, repo } = makePrisma();
    prisma.transaction.findUnique
      .mockResolvedValueOnce(aRow())
      .mockResolvedValueOnce(null);
    const found = await repo.findByIdempotencyKey('k');
    expect(found?.idempotencyKey).toBe(newTx.idempotencyKey);
    expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: 'k' },
      include: { delivery: true },
    });
    await expect(repo.findByIdempotencyKey('k')).resolves.toBeNull();
  });

  it('AC-004-07 markGatewayId stores the gateway transaction id', async () => {
    const { prisma, repo } = makePrisma();
    prisma.transaction.update.mockResolvedValue(
      aRow({ gatewayTransactionId: 'gw-1' }),
    );
    const t = await repo.markGatewayId(aRow().id, 'gw-1');
    expect(t.gatewayTransactionId).toBe('gw-1');
  });

  it('parseShipping rejects malformed JSON', () => {
    expect(parseShipping(null)).toBeNull();
    expect(parseShipping([])).toBeNull();
    expect(parseShipping({ ...shipping, city: 1 })).toBeNull();
  });
});

describe('PrismaTransactionRepository.applyResult', () => {
  const id = aRow().id;
  const approved = {
    status: 'APPROVED' as const,
    gatewayTransactionId: 'gw-1',
    failureReason: null,
  };

  it('AC-004-09 APPROVED: in one DB transaction updates the status, decrements stock by quantity and creates a PENDING delivery', async () => {
    const { tx, prisma, repo } = makePrisma();
    tx.transaction.updateMany.mockResolvedValue({ count: 1 });
    tx.transaction.findUniqueOrThrow
      .mockResolvedValueOnce(aRow({ status: 'APPROVED' }))
      .mockResolvedValueOnce(aRow({ status: 'APPROVED' }));
    tx.product.updateMany.mockResolvedValue({ count: 1 });

    await repo.applyResult(id, approved);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { id, status: 'PENDING' },
      data: {
        status: 'APPROVED',
        failureReason: null,
        gatewayTransactionId: 'gw-1',
      },
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: productId, stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(tx.delivery.create).toHaveBeenCalledWith({
      data: { transactionId: id, customerId: newTx.customerId, ...shipping },
    });
  });

  it.each(['DECLINED', 'ERROR'] as const)(
    'AC-004-10 %s: stores the status and reason, no delivery and no stock change',
    async (status) => {
      const { tx, repo } = makePrisma();
      tx.transaction.updateMany.mockResolvedValue({ count: 1 });
      tx.transaction.findUniqueOrThrow.mockResolvedValue(
        aRow({ status, failureReason: 'rejected' }),
      );
      const { transaction: t, claimed } = await repo.applyResult(id, {
        status,
        gatewayTransactionId: null,
        failureReason: 'rejected',
      });
      expect(claimed).toBe(true);
      expect(tx.transaction.updateMany).toHaveBeenCalledWith({
        where: { id, status: 'PENDING' },
        data: { status, failureReason: 'rejected' },
      });
      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(tx.delivery.create).not.toHaveBeenCalled();
      expect(t.status).toBe(status);
    },
  );

  it('AC-004-11 applying an already applied result (0 rows claimed) does not touch stock nor create a second delivery', async () => {
    const { tx, repo } = makePrisma();
    tx.transaction.updateMany.mockResolvedValue({ count: 0 });
    tx.transaction.findUniqueOrThrow.mockResolvedValue(
      aRow({ status: 'APPROVED' }),
    );
    const { transaction: t, claimed } = await repo.applyResult(id, approved);
    expect(claimed).toBe(false);
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.delivery.create).not.toHaveBeenCalled();
    expect(t.status).toBe('APPROVED');
  });

  it('AC-004-12 APPROVED but the stock ran out during the payment: stock never below 0, no delivery, ERROR with OUT_OF_STOCK_AFTER_PAYMENT', async () => {
    const { tx, repo } = makePrisma();
    tx.transaction.updateMany.mockResolvedValue({ count: 1 });
    tx.transaction.findUniqueOrThrow
      .mockResolvedValueOnce(aRow({ status: 'APPROVED' }))
      .mockResolvedValueOnce(
        aRow({
          status: 'ERROR',
          failureReason: 'OUT_OF_STOCK_AFTER_PAYMENT',
        }),
      );
    tx.product.updateMany.mockResolvedValue({ count: 0 });

    const { transaction: t, claimed } = await repo.applyResult(id, approved);

    expect(claimed).toBe(true);
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id },
      data: { status: 'ERROR', failureReason: 'OUT_OF_STOCK_AFTER_PAYMENT' },
    });
    expect(tx.delivery.create).not.toHaveBeenCalled();
    expect(t).toMatchObject({
      status: 'ERROR',
      failureReason: 'OUT_OF_STOCK_AFTER_PAYMENT',
    });
  });

  it('AC-004-09 throws (rolling back) if an approved transaction has no shipping stored', async () => {
    const { tx, repo } = makePrisma();
    tx.transaction.updateMany.mockResolvedValue({ count: 1 });
    tx.transaction.findUniqueOrThrow.mockResolvedValue(
      aRow({ shipping: null }),
    );
    await expect(repo.applyResult(id, approved)).rejects.toThrow(
      'has no shipping',
    );
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });
});
