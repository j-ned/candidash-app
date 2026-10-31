import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../env.js';
import { jobTracks } from '../db/schema.js';
import { validate } from '../validate.js';
import { requireApiToken, requireUser } from '../auth/middleware.js';
import { deleteJobFiles } from '../files/job-files.js';
import { createJob, findJobByUrl, findOwnJob, listJobs, toJob, updateJob } from '../jobtrack/jobs.js';
import {
  createWithReminderSchema,
  lookupSchema,
  quickAddSchema,
  statusParamSchema,
  updateWithReminderSchema,
} from '../jobtrack/schemas.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const jobTrackRoutes = new Hono<AppEnv>()
  .post('/with-reminder', requireUser, validate('json', createWithReminderSchema), async (c) =>
    c.json(await createJob(c.var.db, c.var.user.sub, c.req.valid('json')), 201),
  )

  // Ajout depuis l'extension : « Envoyée » programme d'office une relance à 7 jours
  .post('/quick-add', requireApiToken, validate('json', quickAddSchema), async (c) => {
    const { status, ...job } = c.req.valid('json');
    const now = Date.now();
    const input =
      status === 'APPLIED'
        ? {
            ...job,
            status,
            appliedAt: new Date(now).toISOString(),
            frequency: 7,
            nextReminderAt: new Date(now + 7 * DAY_MS).toISOString(),
          }
        : { ...job, status };
    return c.json(await createJob(c.var.db, c.var.user.sub, input), 201);
  })

  .get('/lookup', requireApiToken, validate('query', lookupSchema), async (c) =>
    c.json({ jobTrack: await findJobByUrl(c.var.db, c.var.user.sub, c.req.valid('query').url) }),
  )

  .get('/', requireUser, async (c) => c.json(await listJobs(c.var.db, c.var.user.sub)))

  .get('/status/:status', requireUser, validate('param', statusParamSchema), async (c) =>
    c.json(await listJobs(c.var.db, c.var.user.sub, c.req.valid('param').status)),
  )

  .get('/:id', requireUser, async (c) => c.json(toJob(await findOwnJob(c.var.db, c.req.param('id'), c.var.user.sub))))

  .put('/:id/with-reminder', requireUser, validate('json', updateWithReminderSchema), async (c) => {
    const upsert = ['true', '1'].includes(c.req.query('upsert') ?? '');
    return c.json(await updateJob(c.var.db, c.req.param('id'), c.var.user.sub, c.req.valid('json'), upsert));
  })

  .delete('/:id', requireUser, async (c) => {
    const job = await findOwnJob(c.var.db, c.req.param('id'), c.var.user.sub);
    // Les PDF partent du stockage avant la ligne en base (RGPD)
    await deleteJobFiles(c.env.FILES, job.userId, [job]);
    await c.var.db.delete(jobTracks).where(eq(jobTracks.id, job.id));
    return c.json(toJob(job));
  });
