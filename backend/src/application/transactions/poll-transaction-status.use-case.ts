import type {
  GatewayTransaction,
  PaymentGateway,
} from '../../domain/payment/payment-gateway';
import type { Clock } from '../../domain/shared/clock';
import type { DomainError } from '../../domain/shared/domain-error';
import { ok, type Result } from '../../domain/shared/result';
import { isFinal } from '../../domain/transaction/transaction-status';

export interface PollOptions {
  readonly attempts: number;
  readonly intervalMs: number;
}

export const DEFAULT_POLL: PollOptions = { attempts: 10, intervalMs: 1000 };

/**
 * Reads the gateway status every `intervalMs` up to `attempts` times until it is final.
 * Never fails: a read error stops polling and keeps the last known status (PENDING),
 * which GET /transactions/:id resolves later.
 */
export class PollTransactionStatus {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly clock: Clock,
    private readonly options: PollOptions = DEFAULT_POLL,
  ) {}

  async execute(
    initial: GatewayTransaction,
  ): Promise<Result<GatewayTransaction, DomainError>> {
    let latest = initial;
    for (
      let attempt = 0;
      attempt < this.options.attempts && !isFinal(latest.status);
      attempt++
    ) {
      await this.clock.sleep(this.options.intervalMs);
      const read = await this.gateway.getTransaction(initial.id);
      if (!read.ok) break;
      latest = read.value;
    }
    return ok(latest);
  }
}
