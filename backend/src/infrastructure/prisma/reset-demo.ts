import { SEED_PRODUCTS } from './seed-products';

interface Counted {
  count: number;
}

/** The slice of the Prisma client the reset needs (keeps it testable without a DB). */
export interface DemoResetTx {
  delivery: { deleteMany(): Promise<Counted> };
  transaction: { deleteMany(): Promise<Counted> };
  customer: { deleteMany(): Promise<Counted> };
  product: {
    updateMany(args: {
      where: { id: string };
      data: { stock: number };
    }): Promise<Counted>;
  };
}

export interface DemoResetDb {
  $transaction<T>(fn: (tx: DemoResetTx) => Promise<T>): Promise<T>;
}

export interface DemoResetSummary {
  readonly deliveries: number;
  readonly transactions: number;
  readonly customers: number;
  readonly productsRestocked: number;
}

/**
 * Leaves the demo as freshly seeded, in one DB transaction: deletes deliveries,
 * transactions and customers (children first, FKs are RESTRICT) and puts the stock of
 * the seed products back to their seed values. Products themselves are kept.
 */
export const resetDemo = (db: DemoResetDb): Promise<DemoResetSummary> =>
  db.$transaction(async (tx) => {
    const deliveries = await tx.delivery.deleteMany();
    const transactions = await tx.transaction.deleteMany();
    const customers = await tx.customer.deleteMany();
    let productsRestocked = 0;
    for (const product of SEED_PRODUCTS) {
      const updated = await tx.product.updateMany({
        where: { id: product.id },
        data: { stock: product.stock },
      });
      productsRestocked += updated.count;
    }
    return {
      deliveries: deliveries.count,
      transactions: transactions.count,
      customers: customers.count,
      productsRestocked,
    };
  });
