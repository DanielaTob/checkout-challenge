import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { resetDemo } from '../src/infrastructure/prisma/reset-demo';

// Destructive: empties customers, transactions and deliveries. Demo data only (sandbox).
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

resetDemo(prisma)
  .then((s) =>
    console.log(
      `Demo reset: ${s.deliveries} deliveries, ${s.transactions} transactions and ${s.customers} customers deleted; ${s.productsRestocked} products restocked`,
    ),
  )
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
