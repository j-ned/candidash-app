import { existsSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema.js';
import { DEMO_EMAIL, assertDemoOnlyDatabase, seedDemo } from '../src/demo/seed.js';

// Seed de démo d'une base vide (`pnpm db:init-demo`) : aucune donnée réelle, et refus
// de toute base qui contient un autre compte que celui de démo.
if (existsSync('.env')) process.loadEnvFile('.env');

const { DATABASE_URL, DEMO_PASSWORD, APP_ENV } = process.env;
if (APP_ENV === 'production') throw new Error('Seed de démo interdit en production');
if (!DATABASE_URL) throw new Error("Variable d'environnement manquante : DATABASE_URL");
if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 12) {
  throw new Error('DEMO_PASSWORD manquant ou trop court (12 caractères minimum)');
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
try {
  const db = drizzle(pool, { schema });
  await assertDemoOnlyDatabase(db);
  await seedDemo(db, DEMO_PASSWORD);
  console.info(`Base de démo prête : compte ${DEMO_EMAIL}`);
} finally {
  await pool.end();
}
