import { act, render, screen } from '@testing-library/react';
import { headphones } from '../../test/fixtures';
import { ProductCard } from './ProductCard';

describe('ProductCard stock highlight (screen 5)', () => {
  afterEach(() => jest.useRealTimers());

  it('softly highlights the card and announces it when the stock changes', () => {
    jest.useFakeTimers();
    const { rerender } = render(<ProductCard product={{ ...headphones, stock: 10 }} onPay={() => {}} />);
    const card = screen.getByRole('article', { name: headphones.name });
    expect(card).not.toHaveClass('product-card--updated');

    rerender(<ProductCard product={{ ...headphones, stock: 9 }} onPay={() => {}} />);
    expect(card).toHaveClass('product-card--updated');
    expect(screen.getByText('Quedan 9')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Stock actualizado: quedan 9');

    act(() => jest.advanceTimersByTime(2500));
    expect(card).not.toHaveClass('product-card--updated');
  });

  it('does not highlight on first render', () => {
    render(<ProductCard product={headphones} onPay={() => {}} />);
    expect(screen.getByRole('article', { name: headphones.name })).not.toHaveClass('product-card--updated');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
