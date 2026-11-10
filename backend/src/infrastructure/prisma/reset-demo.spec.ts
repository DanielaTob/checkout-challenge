import { resetDemo, type DemoResetTx } from './reset-demo';
import { SEED_PRODUCTS } from './seed-products';

describe('resetDemo', () => {
  it('deletes deliveries, transactions and customers (children first) and restores seed stock in one DB transaction', async () => {
    const order: string[] = [];
    const deleteMany = (name: string, count: number) =>
      jest.fn(() => {
        order.push(name);
        return Promise.resolve({ count });
      });
    const updateMany = jest.fn(() => {
      order.push('product');
      return Promise.resolve({ count: 1 });
    });
    const tx: DemoResetTx = {
      delivery: { deleteMany: deleteMany('deliveries', 1) },
      transaction: { deleteMany: deleteMany('transactions', 2) },
      customer: { deleteMany: deleteMany('customers', 1) },
      product: { updateMany },
    };
    let transactions = 0;
    const summary = await resetDemo({
      $transaction: <T>(fn: (t: DemoResetTx) => Promise<T>): Promise<T> => {
        transactions++;
        return fn(tx);
      },
    });

    expect(transactions).toBe(1);
    expect(order.slice(0, 3)).toEqual([
      'deliveries',
      'transactions',
      'customers',
    ]);
    for (const p of SEED_PRODUCTS) {
      expect(updateMany).toHaveBeenCalledWith({
        where: { id: p.id },
        data: { stock: p.stock },
      });
    }
    expect(summary).toEqual({
      deliveries: 1,
      transactions: 2,
      customers: 1,
      productsRestocked: SEED_PRODUCTS.length,
    });
  });
});
