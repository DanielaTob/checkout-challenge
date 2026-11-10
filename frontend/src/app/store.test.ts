import { goToStep } from '../features/checkout/checkoutSlice';
import { makeStore } from './store';

describe('store', () => {
  it('builds a persisted store and dispatches typed actions', () => {
    const { store, persistor } = makeStore();
    store.dispatch(goToStep('result'));
    expect(store.getState().checkout.step).toBe('result');
    persistor.pause();
  });
});

describe('persistence', () => {
  it('AC-001-07 never persists products (stock is always fetched fresh)', async () => {
    const { persistConfig } = await import('./store');
    expect(persistConfig.whitelist).not.toContain('products');
  });
});
