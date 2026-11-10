import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../shared/api/http';
import { renderWithStore } from '../../test/renderWithStore';
import { ProductList } from './ProductList';
import type { Product } from './types';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
}));
const { getJson } = jest.requireMock<{ getJson: jest.Mock }>('../../shared/api/http');

const headphones: Product = {
  id: '6f1d2c3a-0000-4000-8000-000000000001',
  name: 'Audífonos inalámbricos',
  description: 'Over-ear con cancelación de ruido',
  imageUrl: '/images/headphones.webp',
  priceInCents: 24990000,
  stock: 10,
};
const watch: Product = { ...headphones, id: '6f1d2c3a-0000-4000-8000-000000000002', name: 'Reloj deportivo', stock: 0 };

const plain = (s: string | null) => (s ?? '').replace(/ /g, ' ');

describe('ProductList', () => {
  beforeEach(() => getJson.mockReset());

  it('AC-001-06 shows image, name, description, COP price and available units for each product', async () => {
    getJson.mockResolvedValue([headphones]);
    renderWithStore(<ProductList />);
    const card = await screen.findByRole('article', { name: 'Audífonos inalámbricos' });
    expect(within(card).getByRole('img', { name: 'Audífonos inalámbricos' })).toHaveAttribute('src', '/images/headphones.webp');
    expect(within(card).getByText('Over-ear con cancelación de ruido')).toBeInTheDocument();
    expect(plain(within(card).getByTestId('price').textContent)).toBe('$ 249.900');
    expect(within(card).getByText('10 disponibles')).toBeInTheDocument();
  });

  it('AC-001-07 shows a loading skeleton while the API is answering', () => {
    getJson.mockReturnValue(new Promise(() => {}));
    renderWithStore(<ProductList />);
    expect(screen.getByRole('status', { name: 'Cargando productos' })).toHaveAttribute('aria-busy', 'true');
  });

  it('AC-001-07 shows an error with a Reintentar button that requests the products again', async () => {
    getJson.mockRejectedValueOnce(new ApiError(0, 'Network error')).mockResolvedValueOnce([headphones]);
    renderWithStore(<ProductList />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los productos');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('article', { name: 'Audífonos inalámbricos' })).toBeInTheDocument();
    expect(getJson).toHaveBeenCalledTimes(2);
  });

  it('AC-001-08 marks a product with stock 0 as Agotado and disables its pay button', async () => {
    getJson.mockResolvedValue([headphones, watch]);
    renderWithStore(<ProductList />);
    const soldOut = await screen.findByRole('article', { name: 'Reloj deportivo' });
    expect(within(soldOut).getByText('Agotado')).toBeInTheDocument();
    expect(within(soldOut).getByRole('button', { name: 'Pay with credit card' })).toBeDisabled();
    const available = screen.getByRole('article', { name: 'Audífonos inalámbricos' });
    expect(within(available).getByRole('button', { name: 'Pay with credit card' })).toBeEnabled();
  });

  it('shows an empty-state message (not an error) when there are no products', async () => {
    getJson.mockResolvedValue([]);
    renderWithStore(<ProductList />);
    expect(await screen.findByText('No hay productos disponibles')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not refetch when products are already loaded', async () => {
    renderWithStore(<ProductList />, { products: { items: [headphones], status: 'succeeded', error: null } });
    await waitFor(() => expect(screen.getByRole('article', { name: 'Audífonos inalámbricos' })).toBeInTheDocument());
    expect(getJson).not.toHaveBeenCalled();
  });
});
