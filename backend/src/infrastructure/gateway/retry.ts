import type { Result } from '../../domain/shared/result';

/**
 * Retries a call on the failure track up to `retries` extra times. Only for idempotent
 * reads: creating a payment must never go through here.
 */
export const retry = async <T, E>(
  fn: () => Promise<Result<T, E>>,
  retries: number,
  canRetry: () => boolean = () => true,
): Promise<Result<T, E>> => {
  let result = await fn();
  for (let i = 0; i < retries && !result.ok && canRetry(); i++)
    result = await fn();
  return result;
};
