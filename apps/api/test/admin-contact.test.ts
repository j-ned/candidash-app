import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { capturingMailer, client, memoryLimiter, testEnv } from './helpers';
import { withDb } from './db';
import { loggedIn } from './session';
import { users, visits } from '../src/db/schema';

const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0';

async function asAdmin() {
  const session = await loggedIn();
  await withDb((db) => db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, session.user.id)));
  return session;
}

describe('mesure d’audience', () => {
  it('records a visit without IP nor query, masks ids, and ignores bots', async () => {
    const api = client();
    const path = `/jobtrack/${crypto.randomUUID()}?utm_source=linkedin`;
    const headers = { 'User-Agent': FIREFOX, 'CF-Connecting-IP': '203.0.113.7' };

    expect((await api.post('/analytics/track', { path }, headers)).status).toBe(204);
    expect((await api.post('/analytics/track', { path: '/robot' }, { 'User-Agent': 'Googlebot/2.1' })).status).toBe(204);

    const rows = await withDb((db) => db.select().from(visits).where(eq(visits.path, '/jobtrack/:id')));
    const visit = rows.find((row) => row.source === 'LinkedIn');
    expect(visit?.visitorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(visit)).not.toContain('203.0.113.7');
    expect(await withDb((db) => db.select().from(visits).where(eq(visits.path, '/robot')))).toEqual([]);
  });
});

describe('administration', () => {
  it('lists users and visit stats for an admin only', async () => {
    const { web: user } = await loggedIn();
    expect((await user.get('/admin/users')).status).toBe(403);

    const { web: admin, user: me } = await asAdmin();
    const before = Date.now();
    await admin.post('/jobtrack/with-reminder', { title: 'Dev', frequency: 7, nextReminderAt: new Date().toISOString() });
    const list = (await (await admin.get('/admin/users')).json()) as {
      id: string;
      applicationsCount: number;
      lastActivityAt: string;
    }[];
    const row = list.find((entry) => entry.id === me.id);
    expect(row?.applicationsCount).toBe(1);
    expect(Math.abs(Date.parse(row!.lastActivityAt) - before)).toBeLessThan(60_000);

    const stats = (await (await admin.get('/admin/analytics?days=7')).json()) as { days: number; daily: unknown[] };
    expect(stats.days).toBe(7);
    expect(stats.daily).toHaveLength(7);
    expect((await admin.get('/admin/analytics?days=365')).status).toBe(400);
  });
});

describe('contact', () => {
  const message = { name: 'Camille', email: 'camille@example.com', subject: 'Une question', message: 'Bonjour, une question.' };

  it('forwards the message as plain text with the visitor as reply-to', async () => {
    const { mailer, sent } = capturingMailer();
    const api = client({ mailer, env: testEnv({ CONTACT_RECIPIENT: 'support@candidash.test' }) });

    expect((await api.post('/contact', message)).status).toBe(204);
    expect(sent.at(-1)).toMatchObject({
      to: 'support@candidash.test',
      replyTo: { name: 'Camille', email: 'camille@example.com' },
      subject: '[Candidash contact] Une question',
    });
    expect(sent.at(-1)?.html).toBeUndefined();
  });

  it('drops bots silently, answers 503 without recipient, and limits sending', async () => {
    const { mailer, sent } = capturingMailer();
    const env = testEnv({ CONTACT_RECIPIENT: 'support@candidash.test', CONTACT_LIMITER: memoryLimiter(1) });
    const api = client({ mailer, env });

    expect((await api.post('/contact', { ...message, website: 'spam.example' })).status).toBe(204);
    expect(sent).toEqual([]);
    expect((await client({ mailer }).post('/contact', message)).status).toBe(503);
    expect((await api.post('/contact', message)).status).toBe(429);
  });
});
