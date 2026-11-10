import { act, screen } from '@testing-library/react';
import { initialPaymentState } from '../features/payment/paymentSlice';
import { aTransaction, headphones, quoteFor, summaryCheckout } from '../test/fixtures';
import { renderWithStore } from '../test/renderWithStore';
import { App } from './App';

jest.mock('../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../shared/api/http')>('../shared/api/http'),
  getJson: jest.fn(),
  postJson: jest.fn(),
}));
const { getJson } = jest.requireMock<{ getJson: jest.Mock }>('../shared/api/http');

// After a reload: checkout/payment come back from storage, cardSession is gone (never persisted).
const reloadInto = (checkout: ReturnType<typeof summaryCheckout>, payment = initialPaymentState) =>
  renderWithStore(<App />, { checkout, payment });

describe('resume after reload', () => {
  beforeEach(() => {
    getJson.mockReset();
    getJson.mockImplementation((url: string) =>
      Promise.resolve(url === '/products' ? [headphones] : url.includes('/quote') ? quoteFor(1) : aTransaction()),
    );
  });
  afterEach(() => jest.useRealTimers());

  it('AC-005-01 on the modal step the modal reopens with delivery data and empty card fields', async () => {
    reloadInto(summaryCheckout({ step: 'details', card: null }));
    expect(await screen.findByRole('dialog', { name: 'Pago con tarjeta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('José Pérez');
    expect(screen.getByLabelText('Código postal')).toHaveValue('050021');
    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('');
    expect(screen.getByLabelText('CVC')).toHaveValue('');
  });

  it('AC-005-02 on the summary step it goes back to the modal asking to re-enter the card', async () => {
    const { store } = reloadInto(summaryCheckout());
    expect(await screen.findByText('Por seguridad, vuelve a ingresar los datos de tu tarjeta')).toBeInTheDocument();
    expect(store.getState().checkout.step).toBe('details');
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('José Pérez');
    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('');
  });

  it('AC-005-03 on the result step with a PENDING transaction it resumes polling until final', async () => {
    jest.useFakeTimers();
    getJson.mockImplementation((url: string) =>
      Promise.resolve(url === '/products' ? [headphones] : aTransaction({ status: 'APPROVED' })),
    );
    reloadInto(summaryCheckout({ step: 'result' }), {
      ...initialPaymentState,
      status: 'succeeded',
      idempotencyKey: 'k1',
      transaction: aTransaction({ status: 'PENDING' }),
    });
    expect(screen.getByRole('heading', { name: 'Procesando pago' })).toBeInTheDocument();
    await act(() => jest.advanceTimersByTimeAsync(2000));
    expect(getJson).toHaveBeenCalledWith('/transactions/7a1d2c3a-0000-4000-8000-0000000000aa', expect.anything());
    expect(screen.getByRole('heading', { name: '¡Pago aprobado!' })).toBeInTheDocument();
  });

  it('AC-005-04 on the result step with a final status it shows the same result', () => {
    reloadInto(summaryCheckout({ step: 'result' }), {
      ...initialPaymentState,
      status: 'succeeded',
      idempotencyKey: 'k1',
      transaction: aTransaction({ status: 'DECLINED' }),
    });
    expect(screen.getByRole('heading', { name: 'Pago rechazado' })).toBeInTheDocument();
  });

  it('AC-005-08 products are requested again after a reload on any step', async () => {
    reloadInto(summaryCheckout({ step: 'details', card: null }));
    await screen.findByRole('dialog');
    expect(getJson).toHaveBeenCalledWith('/products', expect.anything());
  });
});
