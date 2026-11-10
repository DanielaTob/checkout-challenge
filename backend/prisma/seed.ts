import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

// Fixed IDs make the seed idempotent (upsert) and give the front a stable product.
const products = [
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

async function main(): Promise<void> {
  for (const p of products) {
    await prisma.product.upsert({ where: { id: p.id }, update: {}, create: p });
  }
  console.log(`Seeded ${products.length} products`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
