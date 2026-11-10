import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Fees, FeesProvider } from '../../domain/quote/quote';

/** Adapter: fixed fees from BASE_FEE_IN_CENTS and DELIVERY_FEE_IN_CENTS. */
@Injectable()
export class ConfigFeesProvider implements FeesProvider {
  constructor(private readonly config: ConfigService) {}

  getFees(): Fees {
    return {
      baseFeeInCents: Number(this.config.getOrThrow('BASE_FEE_IN_CENTS')),
      deliveryFeeInCents: Number(
        this.config.getOrThrow('DELIVERY_FEE_IN_CENTS'),
      ),
    };
  }
}
