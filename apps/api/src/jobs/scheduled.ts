import { and, asc, eq, lt, lte, notInArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { openDb } from '../db/client';
import type { Bindings } from '../env';
import type { Mailer } from '../mail/mailer';
import { jobTracks, pendingUsers, reminders, users, verificationCodes, visits } from '../db/schema';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Mesure d'audience gardée 90 jours (comme l'API Nest). */
export const ANALYTICS_MAX_DAYS = 90;

// Cron Triggers (wrangler.jsonc) : relances toutes les heures, purges chaque nuit
export const HOURLY = '0 * * * *';
export const NIGHTLY = '0 2 * * *';

/**
 * Envoie les relances échues (100 au plus par passage) et reprogramme chacune à sa fréquence.
 * Un envoi raté n'est pas reprogrammé : la relance repart au passage suivant au lieu d'être perdue.
 */
export async function sendDueReminders(db: Db, mailer: Mailer): Promise<{ sent: number; failed: number }> {
  const due = await db
    .select({
      id: reminders.id,
      frequency: reminders.frequency,
      title: jobTracks.title,
      company: jobTracks.company,
      jobUrl: jobTracks.jobUrl,
      appliedAt: jobTracks.appliedAt,
      email: users.email,
      username: users.username,
    })
    .from(reminders)
    .innerJoin(jobTracks, eq(reminders.jobTrackId, jobTracks.id))
    .innerJoin(users, eq(jobTracks.userId, users.id))
    .where(
      and(
        eq(reminders.isActive, true),
        lte(reminders.nextReminderAt, new Date()),
        notInArray(jobTracks.status, ['ACCEPTED', 'REJECTED']),
      ),
    )
    .orderBy(asc(reminders.nextReminderAt))
    .limit(100);

  let sent = 0;
  for (const reminder of due) {
    const ok = await mailer.sendReminder({
      userEmail: reminder.email,
      userName: reminder.username ?? '',
      jobTitle: reminder.title,
      company: reminder.company ?? '',
      appliedAt: reminder.appliedAt ?? undefined,
      jobUrl: reminder.jobUrl ?? undefined,
    });
    if (!ok) continue;
    sent++;
    await db
      .update(reminders)
      .set({
        lastSentAt: new Date(),
        nextReminderAt: new Date(Date.now() + reminder.frequency * DAY_MS),
        updatedAt: new Date(),
      })
      .where(eq(reminders.id, reminder.id));
  }
  return { sent, failed: due.length - sent };
}

/** Sans purge, ces tables grossiraient indéfiniment. */
export async function purgeExpired(db: Db): Promise<void> {
  const now = Date.now();
  await db.delete(verificationCodes).where(lt(verificationCodes.expiresAt, new Date(now)));
  await db.delete(pendingUsers).where(lt(pendingUsers.createdAt, new Date(now - DAY_MS)));
  await db.delete(visits).where(lt(visits.createdAt, new Date(now - ANALYTICS_MAX_DAYS * DAY_MS)));
}

export async function runScheduled(cron: string, env: Bindings, mailer: Mailer): Promise<void> {
  const { db, close } = await openDb(env.HYPERDRIVE.connectionString);
  try {
    if (cron === HOURLY) {
      const { sent, failed } = await sendDueReminders(db, mailer);
      console.log(`Relances : ${sent} envoyée(s), ${failed} échec(s)`);
    }
    if (cron === NIGHTLY) await purgeExpired(db);
  } finally {
    await close();
  }
}
