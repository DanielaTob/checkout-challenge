import { InMemoryCustomerRepository } from '../../test/in-memory-customer.repository';
import { CreateCustomer } from './create-customer.use-case';

const input = {
  fullName: '  Ana Pérez ',
  email: ' Ana@Example.COM ',
  phone: '+573001234567',
};

describe('CreateCustomer', () => {
  it('AC-004-01 creates a new customer with a normalized email', async () => {
    const repo = new InMemoryCustomerRepository();
    const result = await new CreateCustomer(repo).execute(input);
    expect(result).toEqual({
      ok: true,
      value: {
        created: true,
        customer: {
          id: expect.any(String) as string,
          fullName: 'Ana Pérez',
          email: 'ana@example.com',
          phone: '+573001234567',
        },
      },
    });
  });

  it('AC-004-01 reuses the same id and updates the data when the email already exists', async () => {
    const repo = new InMemoryCustomerRepository();
    const useCase = new CreateCustomer(repo);
    const first = await useCase.execute(input);
    const second = await useCase.execute({
      ...input,
      email: 'ana@example.com',
      phone: '+573009999999',
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.created).toBe(false);
    expect(second.value.customer.id).toBe(first.value.customer.id);
    expect(second.value.customer.phone).toBe('+573009999999');
    expect(repo.customers).toHaveLength(1);
  });
});
