import { fireEvent, render, screen, within } from '@testing-library/react';
import { renderWithStore } from '../../test/renderWithStore';
import { ProductImage } from './ProductImage';
import { ProductList } from './ProductList';
import type { Product } from './types';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(),
}));

const make = (n: number): Product => ({
  id: `6f1d2c3a-0000-4000-8000-00000000000${n}`,
  name: `Producto ${n}`,
  description: 'x',
  imageUrl: `/images/p${n}.webp`,
  priceInCents: 100,
  stock: 1,
});

describe('ProductImage', () => {
  it('AC-001-10 reserves its size and decodes asynchronously (alt, width, height, decoding)', () => {
    render(<ProductImage src="/images/headphones.webp" alt="Audífonos" />);
    const img = screen.getByRole('img', { name: 'Audífonos' });
    expect(img).toHaveAttribute('width', '800');
    expect(img).toHaveAttribute('height', '600');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('AC-001-10 only the first product image loads eagerly; the rest are lazy', () => {
    renderWithStore(<ProductList />, { products: { items: [make(1), make(2), make(3)], status: 'succeeded', error: null } });
    const loading = screen.getAllByRole('article').map((a) => within(a).getByRole('img').getAttribute('loading'));
    expect(loading).toEqual(['eager', 'lazy', 'lazy']);
    expect(within(screen.getAllByRole('article')[0]).getByRole('img')).toHaveAttribute('fetchpriority', 'high');
  });

  it('AC-001-10 shows a same-size placeholder when the image fails to load', () => {
    render(<ProductImage src="/broken.webp" alt="Reloj" />);
    fireEvent.error(screen.getByRole('img', { name: 'Reloj' }));
    const placeholder = screen.getByRole('img', { name: 'Reloj' });
    expect(placeholder.tagName).toBe('DIV');
    expect(placeholder).toHaveClass('product-card__image', 'product-card__image--placeholder');
  });
});
