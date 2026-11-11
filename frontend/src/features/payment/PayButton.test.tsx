import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { headphones, quoteFor, summaryCheckout } from '../../test/fixtures';
import { renderWithStore } from '../../test/renderWithStore';
import { SummaryBackdrop } from './SummaryBackdrop';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
  postJson: jest.fn(),
}));
const { getJson, postJson } = jest.requireMock<{ getJson: jest.Mock; postJson: jest.Mock }>('../../shared/api/http');

const card = { number: '4242424242424242', expiry: '08/29', cvc: '123', holderName: 'Jose Perez' };
const setup = () =>
  renderWithStore(<SummaryBackdrop />, {
    checkout: summaryCheckout(),
    cardSession: card,
    products: { items: [headphones], status: 'succeeded', error: null },
  });

/** The quantity selector and "Editar datos" live in the back layer (spec 009): reveal it first. */
const revealBackLayer = async () =>
  userEvent.click(await screen.findByRole('button', { name: /Resumen del pedido/, expanded: true }));

describe('Pagar / Editar datos', () => {
  beforeEach(() => {
    getJson.mockReset().mockResolvedValue(quoteFor(1));
    postJson.mockReset();
  });

  it('AC-003-07 while paying the button is disabled with a spinner and repeated taps send a single payment', async () => {
    let resolveTx: (v: unknown) => void = () => {};
    postJson.mockImplementation((path: string) =>
      path === '/customers' ? Promise.resolve({ id: 'c1' }) : new Promise((r) => (resolveTx = r)),
    );
    setup();
    const pay = await screen.findByRole('button', { name: /Pagar/ });
    await userEvent.click(pay);
    await userEvent.click(pay);
    await userEvent.click(pay);

    const busy = await screen.findByRole('button', { name: /Procesando pago/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(postJson.mock.calls.filter(([p]) => p === '/transactions')).toHaveLength(1);
    resolveTx({ id: 't1', status: 'APPROVED' });
  });

  it('AC-003-07 sends customer (phone digits only) then the transaction with card, shipping and an Idempotency-Key', async () => {
    postJson.mockImplementation((path: string) =>
      Promise.resolve(path === '/customers' ? { id: 'c1' } : { id: 't1', status: 'APPROVED' }),
    );
    const { store } = setup();
    await userEvent.click(await screen.findByRole('button', { name: /Pagar/ }));

    expect(postJson).toHaveBeenNthCalledWith(1, '/customers', { fullName: 'José Pérez', email: 'jose@example.com', phone: '3001234567' });
    const [path, body, headers] = postJson.mock.calls[1] as [string, Record<string, unknown>, Record<string, string>];
    expect(path).toBe('/transactions');
    expect(body).toEqual({
      productId: headphones.id,
      customerId: 'c1',
      quantity: 1,
      shipping: { address: 'Calle 10 # 20-30', city: 'Medellín', region: 'Antioquia', postalCode: '050021' },
      card: { number: '4242424242424242', cvc: '123', expMonth: '08', expYear: '29', holderName: 'Jose Perez' },
    });
    expect(headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(store.getState().checkout.step).toBe('result');
    expect(store.getState().cardSession).toBeNull();
  });

  it('AC-003-08 Editar datos goes back to the modal step keeping the delivery data', async () => {
    const { store } = setup();
    await revealBackLayer();
    await userEvent.click(screen.getByRole('button', { name: 'Editar datos' }));
    expect(store.getState().checkout.step).toBe('details');
    expect(store.getState().checkout.delivery.fullName).toBe('José Pérez');
  });
});

describe('Editar datos keeps the card typed in this session', () => {
  it('AC-003-08 the modal reopens with delivery and the in-memory card prefilled', async () => {
    const { App } = await import('../../app/App');
    getJson.mockImplementation((url: string) => Promise.resolve(url === '/products' ? [headphones] : quoteFor(1)));
    renderWithStore(<App />, {
      checkout: summaryCheckout(),
      cardSession: card,
      products: { items: [headphones], status: 'succeeded', error: null },
    });
    await revealBackLayer();
    await userEvent.click(screen.getByRole('button', { name: 'Editar datos' }));
    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('4242 4242 4242 4242');
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('José Pérez');
  });
});
