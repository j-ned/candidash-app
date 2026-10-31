import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

// Un pool par URL, partagé entre les requêtes d'une même instance (Fluid compute réutilise les
// instances). Peu de connexions : la base est derrière le pooler de Neon.
const pools = new Map<string, Db>();

export function getDb(connectionString: string): Db {
  let db = pools.get(connectionString);
  if (!db) {
    db = drizzle(new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000 }), { schema });
    pools.set(connectionString, db);
  }
  return db;
}
