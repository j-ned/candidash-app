import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

// Un client par requête : Hyperdrive garde le vrai pool de connexions côté Cloudflare,
// un Worker ne doit pas conserver de connexion d'une requête à l'autre.
export async function openDb(
  connectionString: string,
): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new Client({ connectionString });
  await client.connect();
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
