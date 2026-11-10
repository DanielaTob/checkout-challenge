import { makeStore } from '../app/store';

/** Builds the real persisted store and resolves once redux-persist has rehydrated from localStorage. */
export const bootPersistedStore = async () => {
  const { store, persistor } = makeStore();
  await new Promise<void>((resolve) => {
    if (persistor.getState().bootstrapped) return resolve();
    const unsubscribe = persistor.subscribe(() => {
      if (persistor.getState().bootstrapped) {
        unsubscribe();
        resolve();
      }
    });
  });
  return { store, persistor };
};

export const PERSIST_KEY = 'persist:checkout-app';
