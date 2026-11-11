import type { Page, Route } from '@playwright/test';

/**
 * In-browser fake of the backend for the E2E suite (spec 007). Stateful per test:
 * stock goes down only on APPROVED, transactions are stored by id and Idempotency-Key.
 * Card numbers decide the outcome like the gateway sandbox: 4242… → APPROVED, 4111… → DECLINED.
 */
export const API = 'http://api.mock';

export const HEADPHONES = {
  id: '6f1d2c3a-0000-4000-8000-000000000001',
  name: 'Audífonos inalámbricos',
  description: 'Cancelación de ruido activa, 30 h de batería y carga rápida USB-C.',
  imageUrl: '/images/headphones.webp',
  priceInCents: 24990000,
  stock: 10,
};
const WATCH = {
  id: '6f1d2c3a-0000-4000-8000-000000000002',
  name: 'Reloj deportivo',
  description: 'Reloj con GPS, ritmo cardíaco y resistencia al agua 5 ATM.',
  imageUrl: '/images/watch.webp',
  priceInCents: 18990000,
  stock: 5,
};
export const BASE_FEE_IN_CENTS = 300000;
export const DELIVERY_FEE_IN_CENTS = 1000000;

type Status = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';
interface Tx {
  id: string;
  reference: string;
  status: Status;
  totalInCents: number;
  cardBrand: string | null;
  cardLast4: string | null;
  failureReason: string | null;
}
interface TransactionBody {
  productId: string;
  quantity: number;
  card: { number: string };
}

export interface MockApi {
  /** Every POST /transactions that reached the "server" (to prove there is no double charge). */
  readonly transactionPosts: TransactionBody[];
  stockOf(id: string): number;
  /** Next POST /transactions is recorded but never answered (simulates a reload mid-payment). */
  holdNextTransaction(): void;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,accept,idempotency-key',
};

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });

export async function mockApi(page: Page): Promise<MockApi> {
  const products = [structuredClone(HEADPHONES), structuredClone(WATCH)];
  const byId = new Map<string, Tx>();
  const byKey = new Map<string, Tx>();
  const transactionPosts: TransactionBody[] = [];
  let hold = false;
  let seq = 0;

  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const { pathname, searchParams } = new URL(req.url());
    const method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });

    if (method === 'GET' && pathname === '/products') return json(route, 200, products);

    const quote = pathname.match(/^\/products\/([^/]+)\/quote$/);
    if (method === 'GET' && quote) {
      const product = products.find((p) => p.id === quote[1]);
      if (!product) return json(route, 404, { statusCode: 404, error: 'Not Found', message: 'Product not found' });
      const quantity = Number(searchParams.get('quantity') ?? 1);
      const subtotal = product.priceInCents * quantity;
      return json(route, 200, {
        productId: product.id,
        quantity,
        unitPriceInCents: product.priceInCents,
        subtotalInCents: subtotal,
        baseFeeInCents: BASE_FEE_IN_CENTS,
        deliveryFeeInCents: DELIVERY_FEE_IN_CENTS,
        totalInCents: subtotal + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS,
        currency: 'COP',
      });
    }

    if (method === 'POST' && pathname === '/customers') {
      return json(route, 201, { id: '00000000-0000-4000-8000-0000000000c1' });
    }

    if (method === 'POST' && pathname === '/transactions') {
      const key = req.headers()['idempotency-key'] ?? '';
      const body = req.postDataJSON() as TransactionBody;
      transactionPosts.push(body);
      const existing = byKey.get(key);
      if (existing) return json(route, 200, existing);

      const product = products.find((p) => p.id === body.productId);
      if (!product) return json(route, 404, { statusCode: 404, error: 'Not Found', message: 'Product not found' });
      const approved = body.card.number.startsWith('4242');
      if (approved) product.stock -= body.quantity;
      seq += 1;
      const tx: Tx = {
        id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
        reference: `CHK-E2E-${String(seq).padStart(6, '0')}`,
        status: approved ? 'APPROVED' : 'DECLINED',
        totalInCents: product.priceInCents * body.quantity + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS,
        cardBrand: 'VISA',
        cardLast4: body.card.number.slice(-4),
        failureReason: approved ? null : 'DECLINED',
      };
      byId.set(tx.id, tx);
      byKey.set(key, tx);
      if (hold) {
        hold = false;
        return; // never answered: the page reloads while this request is in flight
      }
      return json(route, 201, tx);
    }

    const byKeyMatch = pathname.match(/^\/transactions\/by-key\/([^/]+)$/);
    if (method === 'GET' && byKeyMatch) {
      const tx = byKey.get(byKeyMatch[1]);
      return tx ? json(route, 200, tx) : json(route, 404, { statusCode: 404, error: 'Not Found', message: 'Not found' });
    }

    const txMatch = pathname.match(/^\/transactions\/([^/]+)$/);
    if (method === 'GET' && txMatch) {
      const tx = byId.get(txMatch[1]);
      return tx ? json(route, 200, tx) : json(route, 404, { statusCode: 404, error: 'Not Found', message: 'Not found' });
    }

    return json(route, 404, { statusCode: 404, error: 'Not Found', message: `No mock for ${method} ${pathname}` });
  });

  return {
    transactionPosts,
    stockOf: (id) => products.find((p) => p.id === id)?.stock ?? -1,
    holdNextTransaction: () => {
      hold = true;
    },
  };
}
