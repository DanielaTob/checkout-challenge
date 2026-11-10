import { API_URL, normalizeBaseUrl } from './config';

describe('config', () => {
  it('AC-001-06 reads the API base URL injected at build time', () => {
    expect(API_URL).toBe('http://api.test');
  });

  it('strips trailing slashes', () => {
    expect(normalizeBaseUrl('https://x.test///')).toBe('https://x.test');
    expect(normalizeBaseUrl('')).toBe('');
  });
});
