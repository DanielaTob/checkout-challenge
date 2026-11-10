import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../shared/api/http';
import { headphones, plain, quoteFor, summaryCheckout } from '../../test/fixtures';
import { renderWithStore } from '../../test/renderWithStore';
import { SummarySheet } from './SummarySheet';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
  postJson: jest.fn(),
}));
const { getJson } = jest.requireMock<{ getJson: jest.Mock }>('../../shared/api/http');

const setup = () =>
  renderWithStore(<SummarySheet />, {
    checkout: summaryCheckout(),
    products: { items: [headphones], status: 'succeeded', error: null },
  });
const row = (label: string) => plain(screen.getByText(label).closest('div')?.textContent);

describe('SummarySheet', () => {
  beforeEach(() => getJson.mockReset());

  it('AC-003-04 shows product, quantity and the backend breakdown (subtotal, base fee, delivery, total) in COP', async () => {
    getJson.mockResolvedValue(quoteFor(1));
    setup();
    const sheet = screen.getByRole('dialog', { name: 'Resumen del pedido' });
    expect(within(sheet).getByRole('img', { name: headphones.name })).toBeInTheDocument();
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

describe('SummarySheet layout', () => {
  it('AC-003-10 renders as a modal bottom sheet over a dimmed backdrop', async () => {
    getJson.mockResolvedValue(quoteFor(1));
    setup();
    const sheet = screen.getByRole('dialog', { name: 'Resumen del pedido' });
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    expect(sheet).toHaveClass('sheet');
    expect(sheet.parentElement).toHaveClass('sheet-backdrop');
    expect(await screen.findByRole('button', { name: /Pagar/ })).toBeInTheDocument();
  });
});
