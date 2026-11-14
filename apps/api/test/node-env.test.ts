import { describe, expect, it } from 'vitest';
import { readBindings } from '../src/node-env.js';
import { client, testEnv } from './helpers.js';
import { loggedIn } from './session.js';
import { withDb } from './db.js';
import { eq } from 'drizzle-orm';
import { jobTracks } from '../src/db/schema.js';

const base = {
  DATABASE_URL: testEnv().DATABASE_URL,
  ALLOWED_ORIGINS: 'https://candidash.example.test',
  JWT_SECRET: 'jwt-de-test',
  TOTP_ENCRYPTION_KEY: '0'.repeat(64),
};
const s3 = {
  S3_ENDPOINT: 'https://compte.r2.cloudflarestorage.com',
  S3_ACCESS_KEY: 'cle',
  S3_SECRET_KEY: 'secret',
  S3_BUCKET: 'candidash-app',
};
const smtp = { MAIL_HOST: 'smtp.example.test', MAIL_USER: 'robot@example.test', MAIL_PASSWORD: 'mdp' };

describe('variables exigées en production', () => {
  it('refuses to start in production without the SMTP configuration', () => {
    expect(() => readBindings({ ...base, ...s3, APP_ENV: 'production' })).toThrow('MAIL_HOST');
    expect(() =>
      readBindings({ ...base, ...s3, ...smtp, MAIL_PASSWORD: undefined, APP_ENV: 'production' }),
    ).toThrow('MAIL_PASSWORD');
  });

  it('still requires S3 in production', () => {
    expect(() => readBindings({ ...base, ...smtp, APP_ENV: 'production' })).toThrow('S3_ENDPOINT');
  });

  it('starts in production with everything configured', () => {
    expect(readBindings({ ...base, ...s3, ...smtp, APP_ENV: 'production' }).ENVIRONMENT).toBe('production');
  });

  it('starts in development without SMTP nor S3', () => {
    expect(readBindings({ ...base }).ENVIRONMENT).toBe('development');
  });
});

describe('fichiers hors production sans S3', () => {
  const DISABLED = 'Stockage de fichiers désactivé sur cet environnement';

  async function jobWithCvWithoutStorage() {
    const { web } = await loggedIn({ env: testEnv({ FILES: readBindings({ ...base }).FILES }) });
    const job = (await (
      await web.post('/jobtrack/with-reminder', { title: 'Dev', frequency: 7, nextReminderAt: new Date().toISOString() })
    ).json()) as { id: string };
    // Fiche venue d'ailleurs (seed, import) qui référence un PDF absent du stockage
    await withDb((db) => db.update(jobTracks).set({ cvFileName: 'cv.pdf' }).where(eq(jobTracks.id, job.id)));
    return { web, job };
  }

  it('answers 503 with a clear message on upload and download', async () => {
    const { web, job } = await jobWithCvWithoutStorage();
    const form = new FormData();
    form.set('file', new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' }));

    const upload = await web.post(`/jobtrack/${job.id}/lm`, form);
    const download = await web.get(`/jobtrack/${job.id}/cv`);

    expect([upload.status, download.status]).toEqual([503, 503]);
    expect((await upload.json()).message).toBe(DISABLED);
    expect((await download.json()).message).toBe(DISABLED);
  });

  it('still lets a candidacy with a file be deleted', async () => {
    const { web, job } = await jobWithCvWithoutStorage();

    expect((await web.delete(`/jobtrack/${job.id}`)).status).toBe(200);
  });

  it('keeps the health check up', async () => {
    const env = testEnv({ FILES: readBindings({ ...base }).FILES });
    expect((await client({ env }).get('/health')).status).toBe(200);
  });
});
