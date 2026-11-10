export interface SeedProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  priceInCents: number;
  stock: number;
}

/** Minimal surface of PrismaClient the seed needs (keeps it testable without a database). */
export interface ProductUpserter {
  product: {
    upsert(args: {
      where: { id: string };
      update: object;
      create: SeedProduct;
    }): Promise<unknown>;
  };
}

// Fixed IDs make the seed idempotent and give the front a stable product.
export const SEED_PRODUCTS: readonly SeedProduct[] = [
  {
    id: '6f1d2c3a-0000-4000-8000-000000000001',
    name: 'Audífonos inalámbricos',
    description:
      'Audífonos over-ear con cancelación de ruido y 30 h de batería.',
    imageUrl: '/images/headphones.webp',
    priceInCents: 24990000,
    stock: 10,
  },
  {
    id: '6f1d2c3a-0000-4000-8000-000000000002',
    name: 'Reloj deportivo',
    description: 'Reloj con GPS, ritmo cardíaco y resistencia al agua 5 ATM.',
    imageUrl: '/images/watch.webp',
    priceInCents: 18990000,
    stock: 5,
  },
];

/**
 * Inserts the seed products that don't exist yet. `update: {}` leaves existing rows
 * untouched, so re-running the seed never resets stock that was already sold.
 */
export const seedProducts = async (
  prisma: ProductUpserter,
): Promise<number> => {
  for (const product of SEED_PRODUCTS) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  }
  return SEED_PRODUCTS.length;
};
