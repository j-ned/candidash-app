import { afterEach, describe, expect, it, vi } from 'vitest';
import { capturingMailer, client, testEnv, uniqueEmail } from './helpers.js';
import { createUser, withDb } from './db.js';
import { sendDueReminders } from '../src/jobs/scheduled.js';
import { dbLimiter } from '../src/rate-limit.js';
import { s3Bucket } from '../src/files/bucket.js';
import { jobTracks, reminders } from '../src/db/schema.js';

async function dueReminder() {
  const user = await createUser();
  await withDb(async (db) => {
    const [job] = await db.insert(jobTracks).values({ userId: user.id, title: 'Dev', status: 'APPLIED' }).returning();
    await db
      .insert(reminders)
      .values({ jobTrackId: job!.id, frequency: 3, nextReminderAt: new Date(Date.now() - 60_000) });
  });
  return user;
}

describe('cron quotidien (Vercel Cron)', () => {
  it('refuses a call without the cron secret', async () => {
    const api = client({ env: testEnv({ CRON_SECRET: 'cron-secret-de-test' }) });

    expect((await api.get('/cron/daily')).status).toBe(401);
    expect((await api.get('/cron/daily', { Authorization: 'Bearer faux' })).status).toBe(401);
    expect((await client().get('/cron/daily', { Authorization: 'Bearer ' })).status).toBe(401);
  });

  it('sends due reminders once with the right secret', async () => {
    const user = await dueReminder();
    const { mailer, sent } = capturingMailer();
    const api = client({ mailer, env: testEnv({ CRON_SECRET: 'cron-secret-de-test' }) });

    const res = await api.get('/cron/daily', { Authorization: 'Bearer cron-secret-de-test' });
    expect(res.status).toBe(200);
    expect(sent.filter((e) => e.to === user.email)).toHaveLength(1);
  });

  it('never sends a reminder twice when two runs overlap', async () => {
    const user = await dueReminder();
    const { mailer, sent } = capturingMailer();

    await withDb((db) => Promise.all([sendDueReminders(db, mailer), sendDueReminders(db, mailer)]));

    expect(sent.filter((e) => e.to === user.email)).toHaveLength(1);
  });
});

describe('limiteur en base', () => {
  it('counts per key within the current minute', async () => {
    const key = `test:${uniqueEmail('limit')}`;
    const limiter = await withDb(async (db) => dbLimiter(db, 2));

    const results = [];
    for (let i = 0; i < 3; i++) results.push((await limiter.limit({ key })).success);
    expect(results).toEqual([true, true, false]);
    expect((await limiter.limit({ key: `${key}:autre` })).success).toBe(true);
  });
});

describe('limites de débit en base', () => {
  it('lets 5 logins through before refusing, global and strict limits counted apart', async () => {
    const shared = await withDb(async (db) => dbLimiter(db, 5));
    const generous = await withDb(async (db) => dbLimiter(db, 30));
    const api = client({ env: testEnv({ STRICT_LIMITER: shared, GLOBAL_LIMITER: generous }) });
    const body = { email: uniqueEmail('nobody'), password: 'Secret-123!' };
    const headers = { 'X-Real-IP': `test-${crypto.randomUUID()}` };

    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await api.post('/auth/login', body, headers)).status);
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });
});

describe('bucket R2 en S3', () => {
  afterEach(() => vi.restoreAllMocks());

  const bucket = s3Bucket({
    endpoint: 'https://compte.r2.cloudflarestorage.com',
    region: 'auto',
    accessKeyId: 'cle',
    secretAccessKey: 'secret',
    bucket: 'candidash-app',
  });

  it('signs a PUT on the R2 key path, and maps a missing object to null', async () => {
    const calls: Request[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const request = new Request(input as RequestInfo, init);
      calls.push(request);
      return new Response(request.method === 'GET' ? null : '', { status: request.method === 'GET' ? 404 : 200 });
    });

    await bucket.put('u1/j1/cv.pdf', new TextEncoder().encode('%PDF-').buffer, { contentType: 'application/pdf' });
    expect(await bucket.get('u1/j1/lm.pdf')).toBeNull();

    expect(calls[0]!.method).toBe('PUT');
    expect(calls[0]!.url).toBe('https://compte.r2.cloudflarestorage.com/candidash-app/u1/j1/cv.pdf');
    expect(calls[0]!.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=cle\//);
    expect(calls[0]!.headers.get('content-type')).toBe('application/pdf');
  });

  it('fails loudly on a storage error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('denied', { status: 403 }));

    await expect(bucket.delete('u1/j1/cv.pdf')).rejects.toThrow('403');
  });
});

describe('entrée Vercel', () => {
  it('reads its bindings from process.env when called with the request alone', async () => {
    const vars = {
      DATABASE_URL: testEnv().DATABASE_URL,
      ALLOWED_ORIGINS: 'https://candidash.example.test',
      JWT_SECRET: 'jwt-de-test',
      TOTP_ENCRYPTION_KEY: '0'.repeat(64),
      S3_ENDPOINT: 'https://compte.r2.cloudflarestorage.com',
      S3_ACCESS_KEY: 'cle',
      S3_SECRET_KEY: 'secret',
      S3_BUCKET: 'candidash-app',
    };
    for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value);
    const { default: app } = await import('../src/index.js');

    const res = await app.request('/api/v1/health', { headers: { Origin: 'https://candidash.example.test' } });

    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://candidash.example.test');
    vi.unstubAllEnvs();
  });
});
