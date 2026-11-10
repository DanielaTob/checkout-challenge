import { createLocalStorage } from './storage';

describe('createLocalStorage (redux-persist adapter)', () => {
  beforeEach(() => window.localStorage.clear());

  it('exposes promise-based getItem/setItem/removeItem backed by localStorage', async () => {
    const storage = createLocalStorage();
    await storage.setItem('k', 'v');
    expect(window.localStorage.getItem('k')).toBe('v');
    await expect(storage.getItem('k')).resolves.toBe('v');
    await storage.removeItem('k');
    await expect(storage.getItem('k')).resolves.toBeNull();
  });

  it('never throws when storage is unavailable (e.g. private mode / blocked cookies)', async () => {
    const broken = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    const storage = createLocalStorage(broken);
    await expect(storage.getItem('k')).resolves.toBeNull();
    await expect(storage.setItem('k', 'v')).resolves.toBeUndefined();
    await expect(storage.removeItem('k')).resolves.toBeUndefined();
  });
});
