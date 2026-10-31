import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';

const TIME_ZONE = 'Europe/Paris';
const TOP_LIMIT = 10;

/** Visites par jour (heure de Paris), pages et origines les plus vues — repris de l'API Nest. */
export async function visitStats(db: Db, days: number) {
  const day = sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TIME_ZONE})::date`;
  const since = sql`(now() AT TIME ZONE ${TIME_ZONE})::date - ${days - 1}::int`;
  // Même borne en UTC, comparée telle quelle à "createdAt" : l'index Visites_createdAt_idx sert
  const sinceUtc = sql`((${since})::timestamp AT TIME ZONE ${TIME_ZONE}) AT TIME ZONE 'UTC'`;

  const daily = await db.execute<{ date: string; visitors: string; pageviews: string }>(sql`
    SELECT to_char(d, 'YYYY-MM-DD') AS date,
           COUNT(DISTINCT v."visitorHash") AS visitors,
           COUNT(v.id) AS pageviews
    FROM generate_series(${since}, (now() AT TIME ZONE ${TIME_ZONE})::date, interval '1 day') AS d
    LEFT JOIN "Visites" v ON ${day} = d::date
    GROUP BY d ORDER BY d`);

  const topPages = await db.execute<{ label: string; count: string }>(sql`
    SELECT path AS label, COUNT(*) AS count FROM "Visites"
    WHERE "createdAt" >= ${sinceUtc}
    GROUP BY path ORDER BY count DESC, path LIMIT ${TOP_LIMIT}`);

  // Une ligne par visiteur et par jour : sa première origine connue, sinon accès direct (null)
  const topSources = await db.execute<{ label: string | null; count: string }>(sql`
    WITH per_visit AS (
      SELECT (array_agg(source ORDER BY "createdAt") FILTER (WHERE source IS NOT NULL))[1] AS source
      FROM "Visites"
      WHERE "createdAt" >= ${sinceUtc}
      GROUP BY "visitorHash", ${day}
    )
    SELECT source AS label, COUNT(*) AS count FROM per_visit
    GROUP BY source ORDER BY count DESC, label NULLS LAST LIMIT ${TOP_LIMIT}`);

  const series = daily.rows.map((row) => ({
    date: row.date,
    visitors: Number(row.visitors),
    pageviews: Number(row.pageviews),
  }));
  return {
    days,
    visitors: series.reduce((sum, d) => sum + d.visitors, 0),
    pageviews: series.reduce((sum, d) => sum + d.pageviews, 0),
    daily: series,
    topPages: topPages.rows.map((row) => ({ label: row.label, count: Number(row.count) })),
    topSources: topSources.rows.map((row) => ({ label: row.label, count: Number(row.count) })),
  };
}
