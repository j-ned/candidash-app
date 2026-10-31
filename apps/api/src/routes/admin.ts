import { Hono } from 'hono';
import { count, desc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import type { AppEnv } from '../env.js';
import { jobTracks, users } from '../db/schema.js';
import { validate } from '../validate.js';
import { requireRole, requireUser } from '../auth/middleware.js';
import { visitStats } from '../analytics/stats.js';
import { ANALYTICS_MAX_DAYS } from '../jobs/scheduled.js';

const statsQuery = z
  .object({ days: z.coerce.number().int().min(1).max(ANALYTICS_MAX_DAYS).default(30) })
  .strict();

export const adminRoutes = new Hono<AppEnv>()
  .use(requireUser, requireRole('ADMIN'))

  // Comptes inscrits, avec leur nombre de candidatures et leur dernière activité
  .get('/users', async (c) => {
    const rows = await c.var.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        totpEnabled: users.totpEnabled,
        createdAt: users.createdAt,
        applicationsCount: count(jobTracks.id),
        lastActivityAt: max(jobTracks.updatedAt),
      })
      .from(users)
      .leftJoin(jobTracks, eq(jobTracks.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));
    return c.json(rows);
  })

  .get('/analytics', validate('query', statsQuery), async (c) =>
    c.json(await visitStats(c.var.db, c.req.valid('query').days)),
  );
