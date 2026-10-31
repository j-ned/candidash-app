import { eq, lt, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import type { Mailer } from '../mail/mailer';
import { pendingUsers, rateLimits, reminders, verificationCodes, visits } from '../db/schema';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Mesure d'audience gardée 90 jours (comme l'API Nest). */
export const ANALYTICS_MAX_DAYS = 90;

type ClaimedReminder = {
  id: string;
  previousNext: string;
  previousSent: string | null;
  title: string;
  company: string | null;
  jobUrl: string | null;
  appliedAt: string | null;
  email: string;
  username: string | null;
};

/**
 * Envoie les relances échues (100 au plus par passage). Chacune est d'abord réservée en base —
 * reprogrammée à sa fréquence, lignes verrouillées en SKIP LOCKED — puis envoyée : un cron
 * déclenché deux fois (Vercel ne le garantit pas unique) ne l'envoie qu'une fois. Un envoi raté
 * remet la relance dans son état précédent, elle repart au passage suivant.
 */
export async function sendDueReminders(db: Db, mailer: Mailer): Promise<{ sent: number; failed: number }> {
  const { rows } = await db.execute<ClaimedReminder>(sql`
    WITH due AS (
      SELECT r.id, r."nextReminderAt" AS "previousNext", r."lastSentAt" AS "previousSent"
      FROM "Relance" r
      JOIN "Annonces" a ON a.id = r."jobTrackId"
      WHERE r."isActive" AND r."nextReminderAt" <= (now() AT TIME ZONE 'UTC')
        AND a.status NOT IN ('ACCEPTED', 'REJECTED')
      ORDER BY r."nextReminderAt"
      LIMIT 100
      FOR UPDATE OF r SKIP LOCKED
    )
    UPDATE "Relance" r SET
      "lastSentAt" = now() AT TIME ZONE 'UTC',
      "nextReminderAt" = (now() AT TIME ZONE 'UTC') + make_interval(days => r.frequency),
      "updatedAt" = now() AT TIME ZONE 'UTC'
    FROM due, "Annonces" a, "Utilisateurs" u
    WHERE r.id = due.id AND a.id = r."jobTrackId" AND u.id = a."userId"
    RETURNING r.id, due."previousNext", due."previousSent", a.title, a.company, a."jobUrl",
              a."appliedAt", u.email, u.username`);

  let sent = 0;
  for (const reminder of rows) {
    const ok = await mailer.sendReminder({
      userEmail: reminder.email,
      userName: reminder.username ?? '',
      jobTitle: reminder.title,
      company: reminder.company ?? '',
      appliedAt: reminder.appliedAt ? new Date(reminder.appliedAt) : undefined,
      jobUrl: reminder.jobUrl ?? undefined,
    });
    if (ok) {
      sent++;
      continue;
    }
    await db
      .update(reminders)
      .set({
        nextReminderAt: new Date(reminder.previousNext),
        lastSentAt: reminder.previousSent ? new Date(reminder.previousSent) : null,
      })
      .where(eq(reminders.id, reminder.id));
  }
  return { sent, failed: rows.length - sent };
}

/** Sans purge, ces tables grossiraient indéfiniment. */
export async function purgeExpired(db: Db): Promise<void> {
  const now = Date.now();
  await db.delete(verificationCodes).where(lt(verificationCodes.expiresAt, new Date(now)));
  await db.delete(pendingUsers).where(lt(pendingUsers.createdAt, new Date(now - DAY_MS)));
  await db.delete(visits).where(lt(visits.createdAt, new Date(now - ANALYTICS_MAX_DAYS * DAY_MS)));
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now - DAY_MS)));
}
