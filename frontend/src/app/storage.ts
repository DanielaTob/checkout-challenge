import type { Storage as PersistStorage } from 'redux-persist';

/**
 * redux-persist storage backed by window.localStorage.
 * Replaces `redux-persist/lib/storage`: that CommonJS default export arrives as
 * `{ default: ... }` in Vite's ESM build and breaks rehydration (blank page).
 * Every call is guarded so a blocked storage (private mode) never crashes the app.
 */
export const createLocalStorage = (
  getStore: () => globalThis.Storage = () => window.localStorage,
): PersistStorage => {
  const safely = <T>(fn: (s: globalThis.Storage) => T, fallback: T): T => {
    try {
      return fn(getStore());
    } catch {
      return fallback;
    }
  };
  return {
    getItem: (key: string) => Promise.resolve(safely((s) => s.getItem(key), null)),
    setItem: (key: string, value: string) => Promise.resolve(safely((s) => s.setItem(key, value), undefined)),
    removeItem: (key: string) => Promise.resolve(safely((s) => s.removeItem(key), undefined)),
  };
};
