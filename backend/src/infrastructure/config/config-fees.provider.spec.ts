import type { ConfigService } from '@nestjs/config';
import { ConfigFeesProvider } from './config-fees.provider';

describe('ConfigFeesProvider', () => {
  it('AC-003-01 reads the fixed fees from the environment as numbers', () => {
    const values: Record<string, string> = {
      BASE_FEE_IN_CENTS: '300000',
      DELIVERY_FEE_IN_CENTS: '1000000',
    };
    const config = { getOrThrow: (k: string) => values[k] };
    expect(
      new ConfigFeesProvider(config as unknown as ConfigService).getFees(),
    ).toEqual({ baseFeeInCents: 300000, deliveryFeeInCents: 1000000 });
  });
});
