import { initialCheckoutState, type CheckoutState } from '../features/checkout/checkoutSlice';
import type { Quote } from '../features/payment/types';
import type { Product } from '../features/product/types';

export const headphones: Product = {
  id: '6f1d2c3a-0000-4000-8000-000000000001',
  name: 'Audífonos inalámbricos',
  description: 'Over-ear',
  imageUrl: '/images/headphones.webp',
  priceInCents: 24990000,
  stock: 3,
};

export const quoteFor = (quantity: number, product: Product = headphones): Quote => {
  const subtotal = product.priceInCents * quantity;
  return {
    productId: product.id,
    quantity,
    unitPriceInCents: product.priceInCents,
    subtotalInCents: subtotal,
    baseFeeInCents: 300000,
    deliveryFeeInCents: 1000000,
    totalInCents: subtotal + 1300000,
    currency: 'COP',
  };
};

export const summaryCheckout = (overrides: Partial<CheckoutState> = {}): CheckoutState => ({
  ...initialCheckoutState,
  step: 'summary',
  productId: headphones.id,
  quantity: 1,
  card: { brand: 'VISA', last4: '4242' },
  delivery: {
    fullName: 'José Pérez',
    email: 'jose@example.com',
    phone: '300 123 4567',
    address: 'Calle 10 # 20-30',
    city: 'Medellín',
    region: 'Antioquia',
    postalCode: '050021',
  },
  ...overrides,
});

export const plain = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ');

export const aTransaction = (overrides: Partial<import('../features/payment/types').Transaction> = {}) => ({
  id: '7a1d2c3a-0000-4000-8000-0000000000aa',
  reference: 'TX-7a1d2c3a',
  status: 'APPROVED' as const,
  totalInCents: 26090000,
  cardBrand: 'VISA',
  cardLast4: '4242',
  failureReason: null,
  ...overrides,
});
