import type { Customer, NewCustomer } from './customer';

export interface UpsertedCustomer {
  readonly customer: Customer;
  /** true when the email did not exist and a new customer was inserted. */
  readonly created: boolean;
}

/** Port: customers are identified by email (create or reuse). */
export interface CustomerRepository {
  upsertByEmail(data: NewCustomer): Promise<UpsertedCustomer>;
  findById(id: string): Promise<Customer | null>;
}

export const CUSTOMER_REPOSITORY = Symbol('CustomerRepository');
