import { screen } from '@testing-library/react';
import { renderWithStore } from '../test/renderWithStore';
import { App } from './App';

describe('App', () => {
  it('renders the current step from the store', () => {
    renderWithStore(<App />, { checkout: { step: 'details' } });
    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('data-step', 'details');
  });
});
