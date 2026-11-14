import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Applique les migrations en attente (même table de suivi que `drizzle-kit migrate`), sur une
 * connexion dédiée fermée ensuite. Rejette si la base est injoignable ou si une migration échoue :
 * le conteneur ne démarre pas, Dokploy garde l'ancien en service.
 */
export async function runMigrations(connectionString: string, migrationsFolder: string): Promise<void> {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}
