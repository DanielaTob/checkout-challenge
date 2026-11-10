import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '../../app/store';
import { ApiError } from '../../shared/api/http';
import { aTransaction, headphones, summaryCheckout } from '../../test/fixtures';
import { paymentErrorMessage, payTransaction, pollTransaction } from './paymentSlice';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
  postJson: jest.fn(),
}));
const { getJson, postJson } = jest.requireMock<{ getJson: jest.Mock; postJson: jest.Mock }>('../../shared/api/http');

const card = { number: '4242424242424242', expiry: '08/29', cvc: '123', holderName: 'Jose Perez' };
const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    preloadedState: rootReducer(
      { checkout: summaryCheckout(), cardSession: card, products: { items: [headphones], status: 'succeeded', error: null } } as never,
      { type: '@@init' },
    ),
  });

describe('payTransaction errors', () => {
  beforeEach(() => {
    getJson.mockReset();
    postJson.mockReset();
  });

  it('AC-004-20 a 502 shows "La pasarela no respondió, no se hizo ningún cobro" and keeps the card to retry', async () => {
    postJson.mockImplementation((p: string) =>
      p === '/customers' ? Promise.resolve({ id: 'c1' }) : Promise.reject(new ApiError(502, 'Bad gateway')),
    );
    const store = makeStore();
    await store.dispatch(payTransaction());
    expect(store.getState().payment.status).toBe('failed');
    expect(store.getState().payment.error).toMatch(/La pasarela no respondió, no se hizo ningún cobro/);
    expect(store.getState().cardSession).toEqual(card);
    expect(store.getState().checkout.step).toBe('summary');
  });

  it('AC-004-20 retrying after a network failure reuses the same Idempotency-Key (never a double charge)', async () => {
    postJson
      .mockResolvedValueOnce({ id: 'c1' })
      .mockRejectedValueOnce(new ApiError(0, 'Network error'))
      .mockResolvedValueOnce({ id: 'c1' })
      .mockResolvedValueOnce(aTransaction());
    const store = makeStore();
    await store.dispatch(payTransaction());
    expect(store.getState().payment.error).toMatch(/no se hizo ningún cobro/);
    await store.dispatch(payTransaction());

    const keys = postJson.mock.calls.filter(([p]) => p === '/transactions').map(([, , h]) => (h as Record<string, string>)['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(store.getState().payment).toMatchObject({ status: 'succeeded', transaction: aTransaction() });
    expect(store.getState().checkout.step).toBe('result');
  });

  it.each([
    [new ApiError(409, 'x'), 'Ya no hay stock suficiente para tu pedido'],
    [new ApiError(422, 'x'), 'Revisa los datos de tu tarjeta'],
    [new Error('boom'), 'No pudimos procesar el pago. Intenta de nuevo.'],
  ])('maps %p to a readable message', (e, message) => {
    expect(paymentErrorMessage(e)).toBe(message);
  });

  it('asks to re-enter the card when it is no longer in memory', async () => {
    const store = configureStore({
      reducer: rootReducer,
      preloadedState: rootReducer({ checkout: summaryCheckout() } as never, { type: '@@init' }),
    });
    await store.dispatch(payTransaction());
    expect(store.getState().payment.error).toBe('Por seguridad, vuelve a ingresar los datos de tu tarjeta');
    expect(postJson).not.toHaveBeenCalled();
  });
});

describe('pollTransaction', () => {
  beforeEach(() => getJson.mockReset());

  it('AC-004-18 GETs /transactions/:id and stores the refreshed status', async () => {
    const store = makeStore();
    getJson.mockResolvedValue(aTransaction({ status: 'DECLINED' }));
    await store.dispatch(pollTransaction('7a1d2c3a-0000-4000-8000-0000000000aa'));
    expect(getJson).toHaveBeenCalledWith('/transactions/7a1d2c3a-0000-4000-8000-0000000000aa', expect.anything());
    expect(store.getState().payment.transaction?.status).toBe('DECLINED');
  });

  it('AC-004-18 a failed poll keeps the last known transaction (it will be retried)', async () => {
    const store = makeStore();
    getJson.mockResolvedValueOnce(aTransaction({ status: 'PENDING' })).mockRejectedValueOnce(new ApiError(502, 'x'));
    await store.dispatch(pollTransaction('t'));
    await store.dispatch(pollTransaction('t'));
    expect(store.getState().payment.transaction?.status).toBe('PENDING');
  });
});
