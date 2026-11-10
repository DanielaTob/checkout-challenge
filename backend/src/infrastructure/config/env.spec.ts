import { validateEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://u:p@host/db',
  GATEWAY_BASE_URL: 'https://sandbox.example.test/v1',
  GATEWAY_PUBLIC_KEY: 'pub',
  GATEWAY_PRIVATE_KEY: 'prv',
  GATEWAY_INTEGRITY_SECRET: 'int',
  BASE_FEE_IN_CENTS: '300000',
  DELIVERY_FEE_IN_CENTS: '1000000',
};

describe('validateEnv', () => {
  it('accepts a complete env and converts numbers', () => {
    const env = validateEnv(valid);
    expect(env.BASE_FEE_IN_CENTS).toBe(300000);
    expect(env.DELIVERY_FEE_IN_CENTS).toBe(1000000);
  });

  it('rejects missing vars naming only the properties, never values', () => {
    const rest: Record<string, string> = { ...valid };
    delete rest.GATEWAY_PRIVATE_KEY;
    expect(() => validateEnv({ ...rest, BASE_FEE_IN_CENTS: '-1' })).toThrow(
      /GATEWAY_PRIVATE_KEY.*BASE_FEE_IN_CENTS|BASE_FEE_IN_CENTS.*GATEWAY_PRIVATE_KEY/,
    );
    expect(() =>
      validateEnv({ ...valid, GATEWAY_PRIVATE_KEY: undefined }),
    ).not.toThrow(/prv/);
  });
});
