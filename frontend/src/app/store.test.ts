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
