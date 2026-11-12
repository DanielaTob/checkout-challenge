import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-request context (spec 010): every log line written while handling a request carries its id. */
interface RequestContext {
  readonly requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const currentRequestId = (): string | undefined =>
  requestContext.getStore()?.requestId;
