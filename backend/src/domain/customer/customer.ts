export interface Customer {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
}

export type NewCustomer = Omit<Customer, 'id'>;
