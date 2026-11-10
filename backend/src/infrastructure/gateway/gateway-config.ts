import type { ConfigService } from '@nestjs/config';
import {
  DEFAULT_GATEWAY_TIMEOUT_MS,
  type GatewayConfig,
} from './http-payment-gateway';

export const gatewayConfigFrom = (config: ConfigService): GatewayConfig => ({
  baseUrl: config.getOrThrow<string>('GATEWAY_BASE_URL'),
  publicKey: config.getOrThrow<string>('GATEWAY_PUBLIC_KEY'),
  privateKey: config.getOrThrow<string>('GATEWAY_PRIVATE_KEY'),
  integritySecret: config.getOrThrow<string>('GATEWAY_INTEGRITY_SECRET'),
  timeoutMs: DEFAULT_GATEWAY_TIMEOUT_MS,
});
