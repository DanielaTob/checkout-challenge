import { ApplyTransactionResult } from '../application/transactions/apply-transaction-result.use-case';
import { CreateTransaction } from '../application/transactions/create-transaction.use-case';
import { PollTransactionStatus } from '../application/transactions/poll-transaction-status.use-case';
import { RefreshTransaction } from '../application/transactions/refresh-transaction.use-case';
import type { CreateTransactionInput } from '../application/transactions/create-transaction.use-case';
import { FakeClock, FakePaymentGateway } from './fake-payment-gateway';
import {
  aCustomer,
  InMemoryCustomerRepository,
} from './in-memory-customer.repository';
import {
  aProduct,
  InMemoryProductRepository,
} from './in-memory-product.repository';
import { InMemoryTransactionRepository } from './in-memory-transaction.repository';

export const FEES = { baseFeeInCents: 300000, deliveryFeeInCents: 1000000 };
export const APPROVED_CARD = '4242424242424242';

export const anInput = (
  overrides: Partial<CreateTransactionInput> = {},
): CreateTransactionInput => ({
  idempotencyKey: null,
  productId: aProduct().id,
  customerId: aCustomer().id,
  quantity: 2,
  shipping: {
    address: 'Calle 1 # 2-3',
    city: 'Bogotá',
    region: 'Cundinamarca',
    postalCode: '110111',
  },
  card: {
    number: APPROVED_CARD,
    cvc: '123',
    expMonth: '12',
    expYear: '29',
    holderName: 'Ana Perez',
  },
  ...overrides,
});

/** Wires the checkout use cases with in-memory adapters. */
export const checkoutFixture = (stock = 5) => {
  const product = aProduct({ stock });
  const customer = aCustomer();
  const products = new InMemoryProductRepository([product]);
  const customers = new InMemoryCustomerRepository([customer]);
  const transactions = new InMemoryTransactionRepository(products);
  const gateway = new FakePaymentGateway();
  const clock = new FakeClock();
  const fees = { getFees: () => FEES };
  const poll = new PollTransactionStatus(gateway, clock);
  const apply = new ApplyTransactionResult(transactions);
  const refresh = new RefreshTransaction(gateway, apply);
  let seq = 0;
  const createTransaction = new CreateTransaction({
    products,
    customers,
    transactions,
    gateway,
    fees,
    clock,
    poll,
    apply,
    refresh,
    newReference: () => `TX-${++seq}`,
  });
  return {
    product,
    customer,
    products,
    customers,
    transactions,
    gateway,
    clock,
    fees,
    poll,
    apply,
    refresh,
    createTransaction,
  };
};
