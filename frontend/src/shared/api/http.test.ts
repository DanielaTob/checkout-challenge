import { ApiError, getJson } from './http';

const mockFetch = (impl: () => Promise<Partial<Response>>) => {
  const fn = jest.fn(impl);
  global.fetch = fn as unknown as typeof fetch;
  return fn;
};

describe('getJson', () => {
  afterEach(() => jest.restoreAllMocks());

  it('AC-001-06 GETs API_URL + path and returns the parsed JSON', async () => {
    const fetchMock = mockFetch(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ id: '1' }]) }));
    await expect(getJson('/products')).resolves.toEqual([{ id: '1' }]);
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/products', expect.objectContaining({ headers: { Accept: 'application/json' } }));
  });

  it('throws ApiError with the HTTP status and the API message on non-2xx', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ message: 'Product x not found' }) }));
    await expect(getJson('/products/x')).rejects.toEqual(new ApiError(404, 'Product x not found'));
  });

  it('throws ApiError with a generic message when the error body is not JSON', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 502, json: () => Promise.reject(new Error('not json')) }));
    await expect(getJson('/products')).rejects.toMatchObject({ status: 502, message: 'Request failed (502)' });
  });

  it('throws ApiError with a generic message when the JSON error body has no message', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'x' }) }));
    await expect(getJson('/products')).rejects.toMatchObject({ status: 500, message: 'Request failed (500)' });
  });

  it('throws ApiError with status 0 on network failure', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(getJson('/products')).rejects.toMatchObject({ status: 0, message: 'Network error' });
  });
});

describe('postJson', () => {
  afterEach(() => jest.restoreAllMocks());

  it('POSTs JSON with extra headers and returns the parsed body', async () => {
    const { postJson } = await import('./http');
    const fetchMock = mockFetch(() => Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ id: 'c1' }) }));
    await expect(postJson('/customers', { a: 1 }, { 'Idempotency-Key': 'k' })).resolves.toEqual({ id: 'c1' });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/customers', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Idempotency-Key': 'k' },
      body: JSON.stringify({ a: 1 }),
      signal: undefined,
    });
  });

  it('maps non-2xx to ApiError', async () => {
    const { postJson } = await import('./http');
    mockFetch(() => Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({ message: 'Bad gateway' }) }));
    await expect(postJson('/transactions', {})).rejects.toMatchObject({ status: 502, message: 'Bad gateway' });
  });
});
