import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// `.env` local uniquement ; mêmes migrations et même table de suivi que l'API Nest.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
});
