import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { DEMO_EMAIL, assertDemoOnlyDatabase, seedDemo } from '../src/demo/seed.js';
import { jobTracks, users } from '../src/db/schema.js';
import { client } from './helpers.js';
import { createUser, withDb } from './db.js';

const password = 'Demo-preview-123!';

describe('seed de démo', () => {
  it('creates a demo account that can log in, with sample candidacies, idempotently', async () => {
    await withDb((db) => seedDemo(db, password));
    await withDb((db) => seedDemo(db, password));

    const rows = await withDb((db) => db.select().from(users).where(eq(users.email, DEMO_EMAIL)));
    expect(rows).toHaveLength(1);
    const jobs = await withDb((db) => db.select().from(jobTracks).where(eq(jobTracks.userId, rows[0]!.id)));
    expect(jobs.length).toBeGreaterThanOrEqual(3);
    expect(jobs.every((job) => job.cvFileName === null && job.lmFileName === null)).toBe(true);

    const login = await client().post('/auth/login', { email: DEMO_EMAIL, password });
    expect(login.status).toBe(200);
  });

  it('refuses a database holding any account other than the demo one', async () => {
    await createUser();

    await expect(withDb((db) => assertDemoOnlyDatabase(db))).rejects.toThrow('compte(s) hors démo');
  });
});
