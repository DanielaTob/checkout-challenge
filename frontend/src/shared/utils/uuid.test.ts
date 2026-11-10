import { uuid } from './uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuid', () => {
  it('returns a v4 UUID', () => {
    expect(uuid()).toMatch(V4);
  });

  it('falls back to getRandomValues when randomUUID is missing', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(uuid()).toMatch(V4);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
