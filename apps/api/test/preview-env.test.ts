import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBindings } from '../src/node-env.js';
import { defaultMailer } from '../src/create-app.js';
import { client, testEnv } from './helpers.js';
import { loggedIn } from './session.js';
import { withDb } from './db.js';
import { eq } from 'drizzle-orm';
import { jobTracks } from '../src/db/schema.js';

const sendMail = vi.fn();
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

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

describe('variables par environnement Vercel', () => {
  it('refuses to start in production without the SMTP configuration', () => {
    expect(() => readBindings({ ...base, ...s3, VERCEL_ENV: 'production' })).toThrow('MAIL_HOST');
    expect(() =>
      readBindings({ ...base, ...s3, ...smtp, MAIL_PASSWORD: undefined, VERCEL_ENV: 'production' }),
    ).toThrow('MAIL_PASSWORD');
  });

  it('still requires S3 in production', () => {
    expect(() => readBindings({ ...base, ...smtp, VERCEL_ENV: 'production' })).toThrow('S3_ENDPOINT');
  });

  it('starts in production with everything configured', () => {
    expect(readBindings({ ...base, ...s3, ...smtp, VERCEL_ENV: 'production' }).ENVIRONMENT).toBe('production');
  });

  it('starts a preview without SMTP nor S3', () => {
    expect(readBindings({ ...base, VERCEL_ENV: 'preview' }).ENVIRONMENT).toBe('preview');
  });
});

describe('emails en preview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sendMail.mockReset();
  });

  it('never sends a real email, even when SMTP variables leak into the preview', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const mailer = defaultMailer(readBindings({ ...base, ...s3, ...smtp, VERCEL_ENV: 'preview' }));

    expect(await mailer.sendVerificationCode('julien@example.com', '123456')).toBe(true);

    expect(sendMail).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledOnce();
  });

  it('logs a masked recipient and the subject, never the code nor the reset link', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'info').mockImplementation((...args: unknown[]) => void lines.push(args.join(' ')));
    const mailer = defaultMailer(readBindings({ ...base, ...s3, VERCEL_ENV: 'preview' }));

    await mailer.sendVerificationCode('julien@example.com', '987654');
    await mailer.sendPasswordReset({
      email: 'julien@example.com',
      resetUrl: 'https://preview.example.test/reset-password?token=jeton-secret-42',
    });

    const log = lines.join('\n');
    expect(log).toContain('j***@example.com');
    expect(log).toContain('Code de validation - Candidash');
    expect(log).toContain('Réinitialisation de votre mot de passe');
    expect(log).not.toContain('julien@');
    expect(log).not.toContain('987654');
    expect(log).not.toContain('jeton-secret-42');
  });
});

describe('fichiers en preview sans S3', () => {
  const DISABLED = 'Stockage de fichiers désactivé sur cet environnement';

  async function previewJobWithCv() {
    const { web } = await loggedIn({ env: testEnv({ FILES: readBindings({ ...base, VERCEL_ENV: 'preview' }).FILES }) });
    const job = (await (
      await web.post('/jobtrack/with-reminder', { title: 'Dev', frequency: 7, nextReminderAt: new Date().toISOString() })
    ).json()) as { id: string };
    // Fiche venue d'ailleurs (seed, import) qui référence un PDF absent du stockage
    await withDb((db) => db.update(jobTracks).set({ cvFileName: 'cv.pdf' }).where(eq(jobTracks.id, job.id)));
    return { web, job };
  }

  it('answers 503 with a clear message on upload and download', async () => {
    const { web, job } = await previewJobWithCv();
    const form = new FormData();
    form.set('file', new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' }));

    const upload = await web.post(`/jobtrack/${job.id}/lm`, form);
    const download = await web.get(`/jobtrack/${job.id}/cv`);

    expect([upload.status, download.status]).toEqual([503, 503]);
    expect((await upload.json()).message).toBe(DISABLED);
    expect((await download.json()).message).toBe(DISABLED);
  });

  it('still lets a candidacy with a file be deleted', async () => {
    const { web, job } = await previewJobWithCv();

    expect((await web.delete(`/jobtrack/${job.id}`)).status).toBe(200);
  });

  it('keeps the health check up', async () => {
    const env = testEnv({ FILES: readBindings({ ...base, VERCEL_ENV: 'preview' }).FILES });
    expect((await client({ env }).get('/health')).status).toBe(200);
  });
});
