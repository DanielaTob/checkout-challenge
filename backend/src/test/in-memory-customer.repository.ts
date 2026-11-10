import type { Customer, NewCustomer } from '../domain/customer/customer';
import type {
  CustomerRepository,
  UpsertedCustomer,
} from '../domain/customer/customer.repository';

/** Test double for the CustomerRepository port. */
export class InMemoryCustomerRepository implements CustomerRepository {
  private seq = 0;

  constructor(readonly customers: Customer[] = []) {}

  upsertByEmail(data: NewCustomer): Promise<UpsertedCustomer> {
    const index = this.customers.findIndex((c) => c.email === data.email);
    if (index >= 0) {
      const customer = { ...this.customers[index], ...data };
      this.customers[index] = customer;
      return Promise.resolve({ customer, created: false });
    }
    this.seq++;
    const customer = {
      id: `00000000-0000-4000-8000-${String(this.seq).padStart(12, '0')}`,
      ...data,
    };
    this.customers.push(customer);
    return Promise.resolve({ customer, created: true });
  }

  findById(id: string): Promise<Customer | null> {
    return Promise.resolve(this.customers.find((c) => c.id === id) ?? null);
  }
}

export const aCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: '7a1d2c3a-0000-4000-8000-000000000001',
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+573001234567',
  ...overrides,
});
