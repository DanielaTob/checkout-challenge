import type { PersistedState } from 'redux-persist';

export const PERSIST_VERSION = 2;

const STEPS = ['product', 'details', 'summary', 'result'];
const PAYMENT_STATUSES = ['idle', 'paying', 'succeeded', 'failed'];
const DELIVERY_FIELDS = ['fullName', 'email', 'phone', 'address', 'city', 'region', 'postalCode'];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStringOrNull = (v: unknown) => v === null || typeof v === 'string';

const validCheckout = (c: unknown): boolean =>
  isObject(c) &&
  STEPS.includes(c.step as string) &&
  isStringOrNull(c.productId) &&
  Number.isInteger(c.quantity) &&
  (c.quantity as number) >= 1 &&
  (c.quantity as number) <= 10 &&
  isObject(c.delivery) &&
  DELIVERY_FIELDS.every((f) => typeof (c.delivery as Record<string, unknown>)[f] === 'string') &&
  (c.card === null ||
    (isObject(c.card) && ['VISA', 'MASTERCARD'].includes(c.card.brand as string) && /^\d{4}$/.test(String(c.card.last4))));

const validPayment = (p: unknown): boolean =>
  isObject(p) &&
  PAYMENT_STATUSES.includes(p.status as string) &&
  isStringOrNull(p.idempotencyKey) &&
  isStringOrNull(p.error) &&
  (p.transaction === null || (isObject(p.transaction) && typeof p.transaction.id === 'string'));

/**
 * redux-persist `migrate`: anything persisted by another version, or that does not have the
 * expected shape (corrupted/tampered storage), is discarded and the app starts on the product screen.
 */
export const migratePersistedState = (state: PersistedState, currentVersion: number): Promise<PersistedState> => {
  if (!state) return Promise.resolve(undefined);
  const s = state as unknown as Record<string, unknown>;
  const valid = state._persist?.version === currentVersion && validCheckout(s.checkout) && validPayment(s.payment);
  return Promise.resolve(valid ? state : undefined);
};
