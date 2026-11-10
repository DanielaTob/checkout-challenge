import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Migrations need a direct (non-pooled) Neon connection; runtime uses DATABASE_URL (pooled).
// The placeholder only lets `prisma generate` run in CI without a database.
const url =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://placeholder:placeholder@localhost:5432/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url },
});
