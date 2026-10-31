import { sql } from 'drizzle-orm';
import type { Db } from './db/client.js';
import type { RateLimiter } from './env.js';

/**
 * Fenêtre fixe d'une minute, comptée en base (une requête par appel) : les instances serverless
 * ne partagent pas de mémoire. Les lignes des fenêtres passées sont purgées par le cron quotidien.
 */
export function dbLimiter(db: Db, limit: number): RateLimiter {
  return {
    async limit({ key }) {
      const { rows } = await db.execute<{ count: number }>(sql`
        INSERT INTO "LimitesDebit" (key, "windowStart", count)
        VALUES (${key}, date_trunc('minute', now() AT TIME ZONE 'UTC'), 1)
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN "LimitesDebit"."windowStart" = EXCLUDED."windowStart"
                       THEN "LimitesDebit".count + 1 ELSE 1 END,
          "windowStart" = EXCLUDED."windowStart"
        RETURNING count`);
      return { success: Number(rows[0]?.count ?? 0) <= limit };
    },
  };
}
