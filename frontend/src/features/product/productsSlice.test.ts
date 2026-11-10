import { configureStore } from '@reduxjs/toolkit';
import { ApiError } from '../../shared/api/http';
import { fetchProducts, productsReducer, type ProductsState } from './productsSlice';
import type { Product } from './types';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
}));
const { getJson } = jest.requireMock<{ getJson: jest.Mock }>('../../shared/api/http');

const product: Product = {
  id: '6f1d2c3a-0000-4000-8000-000000000001',
  name: 'Audífonos inalámbricos',
  description: 'Over-ear',
  imageUrl: '/images/headphones.webp',
  priceInCents: 24990000,
  stock: 10,
};

const makeStore = () => configureStore({ reducer: { products: productsReducer } });

describe('productsSlice', () => {
  beforeEach(() => getJson.mockReset());

  it('starts idle with no products', () => {
    expect(productsReducer(undefined, { type: '@@init' })).toEqual<ProductsState>({ items: [], status: 'idle', error: null });
  });

  it('AC-001-07 is loading while the request is in flight', () => {
    getJson.mockReturnValue(new Promise(() => {}));
    const store = makeStore();
    void store.dispatch(fetchProducts());
    expect(store.getState().products.status).toBe('loading');
  });

  it('AC-001-07 stores the products when the API answers', async () => {
    getJson.mockResolvedValue([product]);
    const store = makeStore();
    await store.dispatch(fetchProducts());
    expect(getJson).toHaveBeenCalledWith('/products', expect.anything());
    expect(store.getState().products).toEqual({ items: [product], status: 'succeeded', error: null });
  });

  it('AC-001-07 goes to failed with a message when the API fails, and recovers on retry', async () => {
    getJson.mockRejectedValueOnce(new ApiError(0, 'Network error'));
    const store = makeStore();
    await store.dispatch(fetchProducts());
    expect(store.getState().products).toMatchObject({ status: 'failed', error: 'Network error' });

    getJson.mockResolvedValueOnce([product]);
    await store.dispatch(fetchProducts());
    expect(store.getState().products).toEqual({ items: [product], status: 'succeeded', error: null });
  });

  it('AC-001-07 uses a generic message for unexpected errors', async () => {
    getJson.mockRejectedValue('boom');
    const store = makeStore();
    await store.dispatch(fetchProducts());
    expect(store.getState().products.error).toBe('No pudimos cargar los productos');
  });
});
