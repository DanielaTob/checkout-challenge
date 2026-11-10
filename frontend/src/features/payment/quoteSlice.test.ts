import { configureStore } from '@reduxjs/toolkit';
import { persistConfig } from '../../app/store';
import { ApiError } from '../../shared/api/http';
import { fetchQuote, quoteReducer } from './quoteSlice';
import type { Quote } from './types';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
}));
const { getJson } = jest.requireMock<{ getJson: jest.Mock }>('../../shared/api/http');

const productId = '6f1d2c3a-0000-4000-8000-000000000001';
const quote: Quote = {
  productId,
  quantity: 2,
  unitPriceInCents: 24990000,
  subtotalInCents: 49980000,
  baseFeeInCents: 300000,
  deliveryFeeInCents: 1000000,
  totalInCents: 51280000,
  currency: 'COP',
};
const makeStore = () => configureStore({ reducer: { quote: quoteReducer } });

describe('quoteSlice', () => {
  beforeEach(() => getJson.mockReset());

  it('AC-003-04 requests the backend quote for the product and quantity and stores the amounts', async () => {
    getJson.mockResolvedValue(quote);
    const store = makeStore();
    await store.dispatch(fetchQuote({ productId, quantity: 2 }));
    expect(getJson).toHaveBeenCalledWith(`/products/${productId}/quote?quantity=2`, expect.anything());
    expect(store.getState().quote).toMatchObject({ status: 'succeeded', data: quote, error: null });
  });

  it('AC-003-04 is loading while the quote is in flight', () => {
    getJson.mockReturnValue(new Promise(() => {}));
    const store = makeStore();
    void store.dispatch(fetchQuote({ productId, quantity: 1 }));
    expect(store.getState().quote.status).toBe('loading');
  });

  it('AC-003-09 a 409 is reported as out of stock', async () => {
    getJson.mockRejectedValue(new ApiError(409, 'Not enough stock'));
    const store = makeStore();
    await store.dispatch(fetchQuote({ productId, quantity: 9 }));
    expect(store.getState().quote).toMatchObject({ status: 'failed', data: null, outOfStock: true, error: 'Ya no hay stock suficiente' });
  });

  it('AC-003-04 any other failure gives a retryable error', async () => {
    getJson.mockRejectedValue(new ApiError(0, 'Network error'));
    const store = makeStore();
    await store.dispatch(fetchQuote({ productId, quantity: 1 }));
    expect(store.getState().quote).toMatchObject({ status: 'failed', outOfStock: false, error: 'No pudimos calcular el total' });
  });

  it('AC-003-04 the quote is never persisted (amounts always come from the backend)', () => {
    expect(persistConfig.whitelist).not.toContain('quote');
  });
});
