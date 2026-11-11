import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../shared/api/http';
import { headphones, plain, quoteFor, summaryCheckout } from '../../test/fixtures';
import { renderWithStore } from '../../test/renderWithStore';
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
    expect(screen.getByText('Cantidad: 1', { selector: '.backdrop__quantity' })).toBeVisible();
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

const toggle = () => screen.getByRole('button', { name: /Resumen del pedido/ });
const front = () => screen.getByRole('region', { name: 'Resumen del pedido' });
const pay = () => screen.queryByRole('button', { name: /Pagar/ });
const editButton = () => screen.queryByRole('button', { name: 'Editar datos' });

describe('SummaryBackdrop layers (Material backdrop)', () => {
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
    expect(within(back).getByRole('group', { name: 'Cantidad', hidden: true })).toBeInTheDocument();
    expect(within(back).getByRole('button', { name: 'Editar datos', hidden: true })).toBeInTheDocument();

    expect(within(front()).getByRole('heading', { name: /Resumen del pedido/ })).toBeInTheDocument();
    expect(within(front()).getByText('Tarifa base')).toBeInTheDocument();
    expect(within(front()).getByText('VISA •••• 4242')).toBeInTheDocument();
    expect(within(front()).getByRole('button', { name: /^Pagar \$/ })).toBeEnabled();
  });

  it('AC-009-02 the front layer starts active; the subheader lowers it with a scrim and reveals the back controls', async () => {
    const { container } = setup();
    await screen.findByText('Total');
    expect(editButton()).toBeNull(); // back controls hidden while the front layer is active
    expect(screen.queryByRole('group', { name: 'Cantidad' })).toBeNull();
    expect(pay()).toBeInTheDocument();
    expect(container.querySelector('.backdrop__scrim')).toBeNull();

    await userEvent.click(toggle());
    expect(editButton()).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cantidad' })).toBeInTheDocument();
    expect(pay()).toBeNull(); // only one active layer: the front content is hidden
    expect(container.querySelector('.backdrop__scrim')).not.toBeNull();
    expect(container.querySelector('.backdrop')).toHaveAttribute('data-active', 'back');

    await userEvent.click(toggle());
    expect(pay()).toBeInTheDocument();
    expect(editButton()).toBeNull();
  });

  it('AC-009-02 tapping the scrim brings the front layer back', async () => {
    const { container } = setup();
    await screen.findByText('Total');
    await userEvent.click(toggle());
    await userEvent.click(container.querySelector('.backdrop__scrim') as HTMLElement);
    expect(pay()).toBeInTheDocument();
    expect(container.querySelector('.backdrop')).toHaveAttribute('data-active', 'front');
  });

  it('AC-009-02 the subheader shows the total even when the front layer is lowered', async () => {
    setup();
    await screen.findByText('Total');
    expect(toggle()).not.toHaveTextContent('$'); // the breakdown already shows the total
    await userEvent.click(toggle());
    expect(toggle()).toHaveTextContent('$ 262.900');
    expect(screen.getByText(headphones.description)).toBeVisible();
  });

  it('AC-009-03 aria-expanded/aria-controls follow the active layer, focus moves with it and Esc raises the front layer', async () => {
    setup();
    await screen.findByText('Total');
    expect(toggle()).toHaveFocus();
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    const controls = (toggle().getAttribute('aria-controls') ?? '').split(' ');
    expect(controls).toHaveLength(2);
    for (const id of controls) expect(document.getElementById(id)).not.toBeNull();

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    // − is disabled at quantity 1, so focus lands on the first enabled back control
    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(toggle()).toHaveFocus();
    expect(pay()).toBeInTheDocument();
  });

  it('AC-009-03 Esc does nothing while the front layer is already active', async () => {
    const { store } = setup();
    await screen.findByText('Total');
    await userEvent.keyboard('{Escape}');
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(store.getState().checkout.step).toBe('summary');
  });

  it('AC-009-03 the hidden layer is not focusable: tabbing from the toggle reaches Pagar, not the back controls', async () => {
    setup();
    await screen.findByRole('button', { name: /^Pagar \$/ });
    toggle().focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /^Pagar \$/ })).toHaveFocus();
  });
});
