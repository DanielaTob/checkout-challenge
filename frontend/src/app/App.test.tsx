import { screen } from '@testing-library/react';
import { initialCheckoutState } from '../features/checkout/checkoutSlice';
import { renderWithStore } from '../test/renderWithStore';
import { App } from './App';

jest.mock('../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../shared/api/http')>('../shared/api/http'),
  getJson: jest.fn(() => Promise.resolve([])),
}));

describe('App', () => {
  it('renders the current step from the store and the product list', async () => {
    renderWithStore(<App />, { checkout: { ...initialCheckoutState, step: 'details' } });
    expect(screen.getByRole('heading', { name: 'Ceiba Shop' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Progreso del pago' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('data-step', 'details');
    expect(await screen.findByText('No hay productos disponibles')).toBeInTheDocument();
  });
});
