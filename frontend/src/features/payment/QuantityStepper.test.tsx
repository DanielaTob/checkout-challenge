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
const { getJson } = jest.requireMock<{ getJson: jest.Mock }>('../../shared/api/http');

const setup = (stock = headphones.stock, quantity = 1) =>
  renderWithStore(<SummaryBackdrop />, {
    checkout: summaryCheckout({ quantity }),
    products: { items: [{ ...headphones, stock }], status: 'succeeded', error: null },
  });

describe('QuantityStepper', () => {
  beforeEach(() => {
    getJson.mockReset();
    getJson.mockImplementation((url: string) => Promise.resolve(quoteFor(Number(/quantity=(\d+)/.exec(url)?.[1]))));
  });

  it('AC-003-06 + re-quotes with the new quantity and updates the store', async () => {
    const { store } = setup();
    await screen.findByText('Total');
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    expect(store.getState().checkout.quantity).toBe(2);
    expect(await screen.findByText('Cantidad: 2')).toBeInTheDocument();
    expect(getJson).toHaveBeenLastCalledWith(`/products/${headphones.id}/quote?quantity=2`, expect.anything());
  });

  it('AC-003-06 − is disabled at 1 and + is disabled when quantity reaches the stock', async () => {
    setup(2, 1);
    await screen.findByText('Total');
    expect(screen.getByRole('button', { name: 'Disminuir cantidad' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Disminuir cantidad' }));
    expect(screen.getByRole('button', { name: 'Disminuir cantidad' })).toBeDisabled();
  });

  it('AC-003-06 + is capped at 10 even with more stock', async () => {
    setup(50, 10);
    await screen.findByText('Total');
    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toBeDisabled();
  });
});
