import { screen } from '@testing-library/react';
import { setCardSession } from '../features/checkout/cardSessionSlice';
import { saveDetails, startCheckout } from '../features/checkout/checkoutSlice';
import { initialPaymentState, payTransaction } from '../features/payment/paymentSlice';
import { ApiError } from '../shared/api/http';
import { aTransaction, headphones, summaryCheckout } from '../test/fixtures';
import { bootPersistedStore, PERSIST_KEY } from '../test/persist';
import { renderWithStore } from '../test/renderWithStore';
import { App } from './App';

jest.mock('../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../shared/api/http')>('../shared/api/http'),
  getJson: jest.fn(),
  postJson: jest.fn(),
}));
const { getJson, postJson } = jest.requireMock<{ getJson: jest.Mock; postJson: jest.Mock }>('../shared/api/http');

const inFlight = { ...initialPaymentState, status: 'paying' as const, idempotencyKey: '11111111-2222-4333-8444-555555555555' };
const byKey = `/transactions/by-key/${inFlight.idempotencyKey}`;
const answer = (byKeyResult: () => Promise<unknown>) =>
  getJson.mockImplementation((url: string) => (url === byKey ? byKeyResult() : Promise.resolve([headphones])));

describe('payment in flight during a reload', () => {
  beforeEach(() => {
    getJson.mockReset();
    postJson.mockReset();
    window.localStorage.clear();
  });

  it('AC-005-05 the Idempotency-Key is persisted before the payment request is sent', async () => {
    const { store, persistor } = await bootPersistedStore();
    store.dispatch(startCheckout({ productId: headphones.id }));
    store.dispatch(setCardSession({ number: '4242424242424242', expiry: '08/29', cvc: '123', holderName: 'Jose Perez' }));
    store.dispatch(saveDetails({ delivery: summaryCheckout().delivery, card: { brand: 'VISA', last4: '4242' } }));
    postJson.mockReturnValue(new Promise(() => {})); // the request never answers (user reloads)
    void store.dispatch(payTransaction());
    await persistor.flush();
    const saved = JSON.parse(window.localStorage.getItem(PERSIST_KEY) ?? '{}') as { payment: string };
    const payment = JSON.parse(saved.payment) as { status: string; idempotencyKey: string };
    expect(payment.status).toBe('paying');
    expect(payment.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('AC-005-05 after a reload it looks the payment up by its key and shows the result without paying again', async () => {
    answer(() => Promise.resolve(aTransaction({ status: 'APPROVED' })));
    const { store } = renderWithStore(<App />, { checkout: summaryCheckout(), payment: inFlight });
    expect(await screen.findByRole('heading', { name: '¡Pago aprobado!' })).toBeInTheDocument();
    expect(getJson).toHaveBeenCalledWith(byKey, expect.anything());
    expect(postJson).not.toHaveBeenCalled();
    expect(store.getState().checkout.step).toBe('result');
    expect(store.getState().payment.status).toBe('succeeded');
  });

  it('AC-005-05 a payment aborted by the reload (Firefox/Safari persist it as failed) is also looked up by its key', async () => {
    answer(() => Promise.resolve(aTransaction({ status: 'APPROVED' })));
    const aborted = { ...inFlight, status: 'failed' as const, error: 'La pasarela no respondió, no se hizo ningún cobro. Intenta de nuevo.' };
    renderWithStore(<App />, { checkout: summaryCheckout(), payment: aborted });
    expect(await screen.findByRole('heading', { name: '¡Pago aprobado!' })).toBeInTheDocument();
    expect(getJson).toHaveBeenCalledWith(byKey, expect.anything());
    expect(postJson).not.toHaveBeenCalled();
  });

  it('AC-005-05 a failed payment outside the summary is not looked up again', async () => {
    answer(() => Promise.resolve(aTransaction({ status: 'APPROVED' })));
    const failed = { ...inFlight, status: 'failed' as const, error: 'x' };
    const { store } = renderWithStore(<App />, { checkout: { ...summaryCheckout(), step: 'details' }, payment: failed });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getJson).not.toHaveBeenCalledWith(byKey, expect.anything());
    expect(store.getState().checkout.step).toBe('details');
  });

  it('AC-005-05 a recovered PENDING payment goes to the result screen to keep polling', async () => {
    answer(() => Promise.resolve(aTransaction({ status: 'PENDING' })));
    renderWithStore(<App />, { checkout: summaryCheckout(), payment: inFlight });
    expect(await screen.findByRole('heading', { name: 'Procesando pago' })).toBeInTheDocument();
  });

  it('AC-005-05 if the payment never reached the API (404) it asks for the card again keeping the same key', async () => {
    answer(() => Promise.reject(new ApiError(404, 'not found')));
    const { store } = renderWithStore(<App />, { checkout: summaryCheckout(), payment: inFlight });
    expect(await screen.findByText('Por seguridad, vuelve a ingresar los datos de tu tarjeta')).toBeInTheDocument();
    expect(store.getState().checkout.step).toBe('details');
    expect(store.getState().payment).toMatchObject({ status: 'idle', idempotencyKey: inFlight.idempotencyKey });
  });

  it('AC-005-05 if the lookup fails (network) it keeps the key so a retry stays idempotent', async () => {
    answer(() => Promise.reject(new ApiError(0, 'Network error')));
    const { store } = renderWithStore(<App />, { checkout: summaryCheckout(), payment: inFlight });
    await screen.findByText('Por seguridad, vuelve a ingresar los datos de tu tarjeta');
    expect(store.getState().payment.idempotencyKey).toBe(inFlight.idempotencyKey);
    expect(store.getState().payment.status).not.toBe('paying'); // the stale flag never blocks a new attempt
  });
});
