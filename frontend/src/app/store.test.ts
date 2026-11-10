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

describe('store persistence wiring', () => {
  it('uses the local adapter (a plain object with functions), not the CommonJS default import', async () => {
    const { persistConfig } = await import('./store');
    expect(typeof persistConfig.storage.getItem).toBe('function');
    expect(typeof persistConfig.storage.setItem).toBe('function');
  });
});
