import type { ConfigService } from '@nestjs/config';
import { gatewayConfigFrom } from './gateway-config';

describe('gatewayConfigFrom', () => {
  it('AC-005-11 reads keys from the environment and uses an 8 s timeout', () => {
    const config = { getOrThrow: (k: string) => `value-of-${k}` };
    expect(gatewayConfigFrom(config as unknown as ConfigService)).toEqual({
      baseUrl: 'value-of-GATEWAY_BASE_URL',
      publicKey: 'value-of-GATEWAY_PUBLIC_KEY',
      privateKey: 'value-of-GATEWAY_PRIVATE_KEY',
      integritySecret: 'value-of-GATEWAY_INTEGRITY_SECRET',
      timeoutMs: 8000,
    });
  });
});
