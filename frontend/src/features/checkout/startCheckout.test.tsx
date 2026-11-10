import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { renderWithStore } from '../../test/renderWithStore';
import type { Product } from '../product/types';
import { checkoutReducer, initialCheckoutState, startCheckout } from './checkoutSlice';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
}));
const { getJson } = jest.requireMock<{ getJson: jest.Mock }>('../../shared/api/http');

const product: Product = {
  id: '6f1d2c3a-0000-4000-8000-000000000001',
  name: 'Audífonos inalámbricos',
  description: 'Over-ear',
  imageUrl: '/images/headphones.webp',
  priceInCents: 24990000,
  stock: 10,
};

describe('startCheckout', () => {
  it('AC-001-09 stores the chosen product with quantity 1 and moves to the details step', () => {
    const state = checkoutReducer(initialCheckoutState, startCheckout({ productId: product.id }));
    expect(state).toMatchObject({ step: 'details', productId: product.id, quantity: 1 });
  });

  it('AC-001-09 tapping "Pay with credit card" on a product starts the checkout for that product', async () => {
    getJson.mockResolvedValue([product]);
    const { store } = renderWithStore(<App />);
    const card = await screen.findByRole('article', { name: product.name });
    await userEvent.click(within(card).getByRole('button', { name: 'Pay with credit card' }));
    expect(store.getState().checkout).toMatchObject({ step: 'details', productId: product.id, quantity: 1 });
  });
});
