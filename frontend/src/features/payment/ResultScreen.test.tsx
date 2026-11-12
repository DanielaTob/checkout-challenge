import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyDelivery } from '../../shared/utils/delivery';
import { initialCheckoutState } from '../checkout/checkoutSlice';
import { aTransaction, headphones, plain, summaryCheckout } from '../../test/fixtures';
import { renderWithStore } from '../../test/renderWithStore';
import { initialPaymentState } from './paymentSlice';
import { ResultScreen } from './ResultScreen';
import type { Transaction } from './types';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
  postJson: jest.fn(),
}));
const { getJson } = jest.requireMock<{ getJson: jest.Mock }>('../../shared/api/http');

const setup = (transaction: Transaction) =>
  renderWithStore(<ResultScreen />, {
    checkout: summaryCheckout({ step: 'result' }),
    payment: { ...initialPaymentState, status: 'succeeded', idempotencyKey: 'k1', transaction },
    products: { items: [headphones], status: 'succeeded', error: null },
  });

describe('ResultScreen', () => {
  beforeEach(() => getJson.mockReset());
  afterEach(() => jest.useRealTimers());

  it('AC-004-17 APPROVED shows a success message with the reference and the total', () => {
    setup(aTransaction());
    expect(screen.getByRole('heading', { name: '¡Pago aprobado!' })).toBeInTheDocument();
    expect(screen.getByText('TX-7a1d2c3a')).toBeInTheDocument();
    expect(plain(screen.getByTestId('result-total').textContent)).toBe('$ 260.900');
    expect(screen.getByRole('status')).toHaveTextContent('¡Pago aprobado!');
  });

  it.each(['DECLINED', 'ERROR'] as const)('AC-004-17 %s shows a rejection with "Intentar de nuevo" back to the modal', async (status) => {
    const { store } = setup(aTransaction({ status, failureReason: status === 'ERROR' ? 'OUT_OF_STOCK_AFTER_PAYMENT' : null }));
    expect(screen.getByRole('heading', { name: 'Pago rechazado' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(store.getState().checkout.step).toBe('details');
    // A new attempt must not reuse the key of the rejected payment.
    expect(store.getState().payment).toEqual(initialPaymentState);
  });

  it('AC-004-17 explains when the product ran out during the payment', () => {
    setup(aTransaction({ status: 'ERROR', failureReason: 'OUT_OF_STOCK_AFTER_PAYMENT' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/se agotó mientras se procesaba/);
  });

  it('AC-004-18 PENDING shows "Procesando pago" and polls GET /transactions/:id every 2 s until final', async () => {
    jest.useFakeTimers();
    getJson.mockResolvedValueOnce(aTransaction({ status: 'PENDING' })).mockResolvedValueOnce(aTransaction({ status: 'APPROVED' }));
    setup(aTransaction({ status: 'PENDING' }));
    expect(screen.getByRole('heading', { name: 'Procesando pago' })).toBeInTheDocument();

    await act(() => jest.advanceTimersByTimeAsync(2000));
    expect(getJson).toHaveBeenCalledTimes(1);
    expect(getJson).toHaveBeenCalledWith('/transactions/7a1d2c3a-0000-4000-8000-0000000000aa', expect.anything());
    await act(() => jest.advanceTimersByTimeAsync(2000));
    expect(screen.getByRole('heading', { name: '¡Pago aprobado!' })).toBeInTheDocument();

    await act(() => jest.advanceTimersByTimeAsync(10000));
    expect(getJson).toHaveBeenCalledTimes(2); // stops once final
  });

  it('AC-004-18 stops polling after 2 minutes and lets the user check again', async () => {
    jest.useFakeTimers();
    getJson.mockResolvedValue(aTransaction({ status: 'PENDING' }));
    setup(aTransaction({ status: 'PENDING' }));
    await act(() => jest.advanceTimersByTimeAsync(120000));
    const calls = getJson.mock.calls.length;
    expect(calls).toBeGreaterThanOrEqual(59);
    expect(calls).toBeLessThanOrEqual(60);
    expect(screen.getByText('Seguimos procesando tu pago')).toBeInTheDocument();
    await act(() => jest.advanceTimersByTimeAsync(10000));
    expect(getJson.mock.calls.length).toBe(calls);

    getJson.mockResolvedValueOnce(aTransaction({ status: 'APPROVED' }));
    jest.useRealTimers();
    await userEvent.click(screen.getByRole('button', { name: 'Consultar de nuevo' }));
    expect(await screen.findByRole('heading', { name: '¡Pago aprobado!' })).toBeInTheDocument();
  });

  it('AC-004-19 AC-011-01 after APPROVED, Volver a la tienda returns to the product screen, refetches stock and resets the whole checkout', async () => {
    getJson.mockResolvedValue([{ ...headphones, stock: 2 }]);
    const { store } = setup(aTransaction());
    await userEvent.click(screen.getByRole('button', { name: 'Volver a la tienda' }));
    const state = store.getState();
    // Delivery data, masked card, product, quantity and step: all back to the initial state.
    expect(state.checkout).toEqual(initialCheckoutState);
    expect(state.checkout.delivery).toEqual(emptyDelivery);
    expect(state.payment).toEqual(initialPaymentState);
    expect(state.cardSession).toBeNull();
    expect(getJson).toHaveBeenCalledWith('/products', expect.anything());
    await waitFor(() => expect(store.getState().products.items[0].stock).toBe(2));
  });

  it.each(['DECLINED', 'ERROR'] as const)(
    'AC-011-04 %s: Intentar de nuevo opens the modal with the delivery data and without the card or the old key',
    async (status) => {
      const { store } = setup(aTransaction({ status }));
      await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
      const state = store.getState();
      expect(state.checkout.step).toBe('details');
      expect(state.checkout.delivery).toEqual(summaryCheckout().delivery);
      expect(state.payment.idempotencyKey).toBeNull();
      expect(state.payment.transaction).toBeNull();
    },
  );

  it.each(['DECLINED', 'ERROR'] as const)(
    'AC-011-05 %s: Volver a la tienda clears card and transaction but keeps the delivery data',
    async (status) => {
      getJson.mockResolvedValue([headphones]);
      const { store } = setup(aTransaction({ status }));
      await userEvent.click(screen.getByRole('button', { name: 'Volver a la tienda' }));
      const state = store.getState();
      expect(state.checkout).toEqual({ ...initialCheckoutState, delivery: summaryCheckout().delivery });
      expect(state.payment).toEqual(initialPaymentState);
      expect(state.cardSession).toBeNull();
    },
  );
});
