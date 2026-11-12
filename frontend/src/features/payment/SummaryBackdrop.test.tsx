import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../shared/api/http';
import { headphones, plain, quoteFor, summaryCheckout } from '../../test/fixtures';
import { renderWithStore } from '../../test/renderWithStore';
import { initialPaymentState } from './paymentSlice';
import { SummaryBackdrop } from './SummaryBackdrop';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
  postJson: jest.fn(),
}));
const { getJson } = jest.requireMock<{ getJson: jest.Mock }>('../../shared/api/http');

const setup = () =>
  renderWithStore(<SummaryBackdrop />, {
    checkout: summaryCheckout(),
    products: { items: [headphones], status: 'succeeded', error: null },
  });
const row = (label: string) => plain(screen.getByText(label).closest('div')?.textContent);

describe('SummaryBackdrop', () => {
  beforeEach(() => getJson.mockReset());

  it('AC-003-04 shows product, quantity and the backend breakdown (subtotal, base fee, delivery, total) in COP', async () => {
    getJson.mockResolvedValue(quoteFor(1));
    setup();
    expect(screen.getByRole('img', { name: headphones.name })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cantidad' })).toHaveTextContent('Cantidad: 1');
    expect(await screen.findByText('Total')).toBeInTheDocument();
    expect(row('Subtotal')).toContain('$ 249.900');
    expect(row('Tarifa base')).toContain('$ 3.000');
    expect(row('Envío')).toContain('$ 10.000');
    expect(row('Total')).toContain('$ 262.900');
    expect(getJson).toHaveBeenCalledWith(`/products/${headphones.id}/quote?quantity=1`, expect.anything());
  });

  it('AC-003-05 shows the card masked as brand + last 4, never the full number', async () => {
    getJson.mockResolvedValue(quoteFor(1));
    const { container } = setup();
    expect(await screen.findByText('VISA •••• 4242')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/4242\s?4242/);
  });

  it('AC-003-09 a 409 quote shows "Ya no hay stock suficiente" and disables Pagar', async () => {
    getJson.mockRejectedValue(new ApiError(409, 'Not enough stock'));
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya no hay stock suficiente');
    expect(screen.getByRole('button', { name: /Pagar/ })).toBeDisabled();
  });

  it('AC-003-04 a failed quote offers Reintentar and keeps Pagar disabled until it succeeds', async () => {
    getJson.mockRejectedValueOnce(new ApiError(0, 'Network error')).mockResolvedValueOnce(quoteFor(1));
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos calcular el total');
    expect(screen.getByRole('button', { name: /Pagar/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Total')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pagar/ })).toBeEnabled();
  });
});

const front = () => screen.getByRole('region', { name: 'Resumen del pedido' });
const pay = () => screen.getByRole('button', { name: /^Pagar \$/ });

describe('SummaryBackdrop layers (two fixed layers, ADR 0006)', () => {
  beforeEach(() => getJson.mockReset().mockResolvedValue(quoteFor(1)));

  it('AC-003-10 AC-009-01 back layer holds product, quantity and Editar datos; front layer holds breakdown, card and Pagar; no dialog', async () => {
    const { container } = setup();
    await screen.findByText('Total');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-modal]')).toBeNull();

    const back = container.querySelector('.backdrop__back') as HTMLElement;
    expect(within(back).getByRole('img', { name: headphones.name })).toBeInTheDocument();
    expect(within(back).getByText(headphones.name)).toBeInTheDocument();
    expect(within(back).getByText('$ 249.900 c/u')).toBeInTheDocument();
    expect(within(back).getByRole('group', { name: 'Cantidad' })).toBeVisible();
    expect(within(back).getByRole('button', { name: 'Editar datos' })).toBeVisible();

    expect(within(front()).getByRole('heading', { name: 'Resumen del pedido' })).toBeInTheDocument();
    expect(within(front()).getByText('Tarifa base')).toBeInTheDocument();
    expect(within(front()).getByText('VISA •••• 4242')).toBeInTheDocument();
    expect(within(front()).getByRole('button', { name: /^Pagar \$/ })).toBeEnabled();
  });

  it('AC-009-02 both layers stay visible: no collapse/expand toggle, no aria-expanded, no scrim, nothing hidden', async () => {
    const { container } = setup();
    await screen.findByText('Total');
    expect(screen.queryByRole('button', { name: /Resumen del pedido/ })).toBeNull();
    expect(container.querySelector('[aria-expanded]')).toBeNull();
    expect(container.querySelector('.backdrop__scrim')).toBeNull();
    expect(container.querySelector('[hidden]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Editar datos' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toBeVisible();
    expect(pay()).toBeVisible();
  });

  it('AC-009-02 changing the quantity re-quotes the front layer while both stay on screen', async () => {
    getJson.mockReset().mockImplementation((url: string) => Promise.resolve(quoteFor(Number(/quantity=(\d+)/.exec(url)?.[1]))));
    setup();
    await screen.findByText('Total');
    expect(pay()).toHaveTextContent('262.900');
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    expect(await screen.findByRole('button', { name: /^Pagar .*512\.800/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Editar datos' })).toBeVisible();
  });

  it('AC-009-03 focus enters on the "Resumen del pedido" heading, which names the front region', async () => {
    setup();
    const heading = screen.getByRole('heading', { name: 'Resumen del pedido' });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(front()).toContainElement(heading);
    await screen.findByText('Total');
  });

  it('AC-009-03 tab order follows the document: back controls (−/+, Editar datos) then Pagar', async () => {
    setup();
    await screen.findByRole('button', { name: /^Pagar \$/ });
    (document.activeElement as HTMLElement).blur();
    await userEvent.tab(); // − is disabled at quantity 1
    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Editar datos' })).toHaveFocus();
    await userEvent.tab();
    expect(pay()).toHaveFocus();
  });

  it('AC-009-02 while paying, the quantity and Editar datos are disabled so the order cannot change', async () => {
    renderWithStore(<SummaryBackdrop />, {
      checkout: summaryCheckout({ quantity: 2 }),
      products: { items: [headphones], status: 'succeeded', error: null },
      payment: { ...initialPaymentState, status: 'paying', idempotencyKey: 'k1' },
    });
    expect(screen.getByRole('button', { name: 'Editar datos' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Disminuir cantidad' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Procesando pago/ })).toBeDisabled();
  });
});
