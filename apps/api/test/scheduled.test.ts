import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { capturingMailer, uniqueEmail } from './helpers.js';
import { createUser, withDb } from './db.js';
import { purgeExpired, sendDueReminders } from '../src/jobs/scheduled.js';
import { templatedMailer } from '../src/mail/mailer.js';
import { jobTracks, pendingUsers, reminders, verificationCodes, visits, type JobStatus } from '../src/db/schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

async function reminderFor(status: JobStatus, options: { dueInMs?: number; isActive?: boolean } = {}) {
  const user = await createUser();
  return withDb(async (db) => {
    const [job] = await db
      .insert(jobTracks)
      .values({ userId: user.id, title: 'Dev Angular', company: 'ACME', status })
      .returning();
    const [reminder] = await db
      .insert(reminders)
      .values({
        jobTrackId: job!.id,
        frequency: 4,
        nextReminderAt: new Date(Date.now() + (options.dueInMs ?? -60_000)),
        isActive: options.isActive ?? true,
      })
      .returning();
    return { user, reminder: reminder! };
  });
}

const readReminder = (id: string) =>
  withDb(async (db) => (await db.query.reminders.findFirst({ where: eq(reminders.id, id) }))!);

describe('relances (cron horaire)', () => {
  it('emails a due reminder with the Nest template and reschedules it at its frequency', async () => {
    const { user, reminder } = await reminderFor('APPLIED');
    const { mailer, sent } = capturingMailer();

    await withDb((db) => sendDueReminders(db, mailer));

    const email = sent.find((e) => e.to === user.email);
    expect(email?.subject).toBe('Rappel de candidature - Dev Angular chez ACME');
    expect(email?.html).toContain('Dev Angular');
    const after = await readReminder(reminder.id);
    expect(after.lastSentAt).not.toBeNull();
    expect(after.nextReminderAt.getTime()).toBeGreaterThan(Date.now() + 4 * DAY_MS - 60_000);
  });

  it('keeps a reminder due when its email could not be sent', async () => {
    const { reminder } = await reminderFor('APPLIED');

    await withDb((db) => sendDueReminders(db, templatedMailer(async () => false)));

    expect((await readReminder(reminder.id)).lastSentAt).toBeNull();
  });

  it.each([
    ['a terminal status', 'REJECTED', {}],
    ['an inactive reminder', 'APPLIED', { isActive: false }],
    ['a future reminder', 'APPLIED', { dueInMs: DAY_MS }],
  ] as const)('sends nothing for %s', async (_case, status, options) => {
    const { user } = await reminderFor(status, options);
    const { mailer, sent } = capturingMailer();

    await withDb((db) => sendDueReminders(db, mailer));

    expect(sent.filter((e) => e.to === user.email)).toEqual([]);
  });
});

describe('purges (cron nocturne)', () => {
  it('removes expired codes, stale pending sign-ups and visits older than 90 days, and nothing else', async () => {
    const [expired, fresh, stale, recent] = [1, 2, 3, 4].map(() => uniqueEmail('purge'));
    const [oldVisit, newVisit] = [crypto.randomUUID(), crypto.randomUUID()];
    await withDb(async (db) => {
      await db.insert(verificationCodes).values([
        { email: expired!, code: '111111', expiresAt: new Date(Date.now() - 1000) },
        { email: fresh!, code: '222222', expiresAt: new Date(Date.now() + 60_000) },
      ]);
      await db.insert(pendingUsers).values([
        { email: stale!, password: 'x', createdAt: new Date(Date.now() - 2 * DAY_MS) },
        { email: recent!, password: 'x' },
      ]);
      await db.insert(visits).values([
        { id: oldVisit, visitorHash: 'h', path: '/', createdAt: new Date(Date.now() - 91 * DAY_MS) },
        { id: newVisit, visitorHash: 'h', path: '/' },
      ]);
      await purgeExpired(db);
    });

    const left = await withDb(async (db) => ({
      codes: (await db.select().from(verificationCodes)).map((r) => r.email),
      pending: (await db.select().from(pendingUsers)).map((r) => r.email),
      visits: (await db.select().from(visits)).map((r) => r.id),
    }));
    expect(left.codes).toContain(fresh);
    expect(left.codes).not.toContain(expired);
    expect(left.pending).toContain(recent);
    expect(left.pending).not.toContain(stale);
    expect(left.visits).toContain(newVisit);
    expect(left.visits).not.toContain(oldVisit);
  });
});
