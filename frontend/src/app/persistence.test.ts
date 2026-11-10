import { goToStep, startCheckout } from '../features/checkout/checkoutSlice';
import { bootPersistedStore, PERSIST_KEY } from '../test/persist';
import { persistConfig, PERSIST_VERSION } from './store';

const write = (value: Record<string, unknown>) =>
  window.localStorage.setItem(
    PERSIST_KEY,
    JSON.stringify(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, JSON.stringify(v)]))),
  );

describe('persistence (versioned)', () => {
  beforeEach(() => window.localStorage.clear());

  it('AC-005-07 restores a valid state of the current version', async () => {
    const first = await bootPersistedStore();
    first.store.dispatch(startCheckout({ productId: '6f1d2c3a-0000-4000-8000-000000000001' }));
    await first.persistor.flush();

    const { store } = await bootPersistedStore();
    expect(store.getState().checkout).toMatchObject({ step: 'details', productId: '6f1d2c3a-0000-4000-8000-000000000001' });
  });

  it('AC-005-07 a state from an older version starts again on the product screen', async () => {
    write({ checkout: { step: 'summary', productId: 'x' }, _persist: { version: 1, rehydrated: true } });
    const { store } = await bootPersistedStore();
    expect(store.getState().checkout.step).toBe('product');
  });

  it('AC-005-07 a corrupt or malformed state starts again on the product screen without errors', async () => {
    window.localStorage.setItem(PERSIST_KEY, '{not json');
    const corrupt = await bootPersistedStore();
    expect(corrupt.store.getState().checkout.step).toBe('product');

    write({ checkout: { step: 'hacked', quantity: -3 }, _persist: { version: PERSIST_VERSION, rehydrated: true } });
    const malformed = await bootPersistedStore();
    expect(malformed.store.getState().checkout.step).toBe('product');
  });

  it('AC-005-08 products and quotes are never persisted (always fetched again)', async () => {
    expect(persistConfig.whitelist).toEqual(['checkout', 'payment']);
    const { store, persistor } = await bootPersistedStore();
    store.dispatch(goToStep('summary'));
    await persistor.flush();
    const saved = JSON.parse(window.localStorage.getItem(PERSIST_KEY) ?? '{}') as Record<string, unknown>;
    expect(Object.keys(saved).sort()).toEqual(['_persist', 'checkout', 'payment']);
  });
});
