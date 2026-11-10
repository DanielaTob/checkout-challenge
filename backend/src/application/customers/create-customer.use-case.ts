import type { NewCustomer } from '../../domain/customer/customer';
import type {
  CustomerRepository,
  UpsertedCustomer,
} from '../../domain/customer/customer.repository';
import type { DomainError } from '../../domain/shared/domain-error';
import { ok, type Result } from '../../domain/shared/result';

/** Creates the customer or reuses it by email (the email is the natural key). */
export class CreateCustomer {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(
    input: NewCustomer,
  ): Promise<Result<UpsertedCustomer, DomainError>> {
    return ok(
      await this.customers.upsertByEmail({
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
      }),
    );
  }
}
