import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { jobTracks, reminders, type JobStatus, type JobTrackRow, type ReminderRow } from '../db/schema.js';
import { httpError } from '../http-errors.js';
import { normalizeJobUrl } from './normalize-job-url.js';
import type { JobInput } from './schemas.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_REMINDER_FREQUENCY_DAYS = 7;
const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set(['ACCEPTED', 'REJECTED']);

/** Un texte vide efface la valeur plutôt que d'enregistrer une chaîne vide. */
const blankToNull = (text: string | undefined) => (text?.trim() ? text : null);

const toReminder = (row: ReminderRow) => ({
  id: row.id,
  jobTrackId: row.jobTrackId,
  frequency: row.frequency,
  nextReminderAt: row.nextReminderAt,
  lastSentAt: row.lastSentAt,
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** Forme publique d'une candidature (même JSON que l'API Nest). */
export function toJob(row: Omit<JobTrackRow, 'offerText'> & { offerText?: string | null; reminders?: ReminderRow[] }) {
  const reminder = row.reminders?.[0];
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    company: row.company ?? undefined,
    jobUrl: row.jobUrl ?? undefined,
    appliedAt: row.appliedAt ?? undefined,
    status: row.status,
    contractType: row.contractType ?? undefined,
    notes: row.notes ?? undefined,
    offerText: row.offerText ?? undefined,
    cvFileName: row.cvFileName ?? undefined,
    lmFileName: row.lmFileName ?? undefined,
    reminder: reminder ? toReminder(reminder) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Le texte de l'offre (jusqu'à 20 000 caractères) reste sur le détail : la liste ne le lit pas. */
export async function listJobs(db: Db, userId: string, status?: JobStatus) {
  const rows = await db.query.jobTracks.findMany({
    where: status ? and(eq(jobTracks.userId, userId), eq(jobTracks.status, status)) : eq(jobTracks.userId, userId),
    columns: { offerText: false },
    with: { reminders: true },
    orderBy: [desc(jobTracks.createdAt)],
  });
  return rows.map(toJob);
}

/** Candidature de l'utilisateur, ou 404 : une candidature d'autrui n'existe pas pour lui. */
export async function findOwnJob(db: Db, id: string, userId: string) {
  const row = await db.query.jobTracks.findFirst({
    where: and(eq(jobTracks.id, id), eq(jobTracks.userId, userId)),
    with: { reminders: true },
  });
  if (!row) throw httpError(404, 'Annonce introuvable');
  return row;
}

/** Candidature déjà suivie pour cette offre (URL canonique), sans lire les textes des autres. */
export async function findJobByUrl(db: Db, userId: string, rawUrl: string) {
  const target = normalizeJobUrl(rawUrl);
  if (!target) return null;
  const urls = await db.query.jobTracks.findMany({
    where: eq(jobTracks.userId, userId),
    columns: { id: true, jobUrl: true },
  });
  const match = urls.find((job) => job.jobUrl && normalizeJobUrl(job.jobUrl) === target);
  if (!match) return null;
  return { ...toJob(await findOwnJob(db, match.id, userId)), offerText: undefined };
}

const jobValues = (input: JobInput) => ({
  title: input.title ?? 'New Job',
  company: input.company,
  jobUrl: input.jobUrl,
  appliedAt: input.appliedAt ? new Date(input.appliedAt) : undefined,
  status: input.status ?? 'APPLIED',
  contractType: input.contractType,
  notes: input.notes,
  offerText: blankToNull(input.offerText),
});

/** Crée la candidature et, si une fréquence et une date sont données, son rappel. */
export async function createJob(db: Db, userId: string, input: JobInput, id?: string) {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .insert(jobTracks)
      .values({ ...(id && { id }), userId, ...jobValues(input) })
      .returning();
    const created = [];
    if (input.frequency !== undefined && input.nextReminderAt) {
      const [reminder] = await tx
        .insert(reminders)
        .values({
          jobTrackId: job!.id,
          frequency: input.frequency,
          nextReminderAt: new Date(input.nextReminderAt),
          isActive: input.isActive ?? true,
        })
        .returning();
      created.push(reminder!);
    }
    return toJob({ ...job!, reminders: created });
  });
}

/**
 * Met à jour la candidature et son rappel en un appel (upsert : la crée si l'id n'existe pas).
 * Statut terminal → rappel désactivé ; passage à « Envoyée » sans réglage → relance programmée.
 */
export async function updateJob(db: Db, id: string, userId: string, input: JobInput, upsert: boolean) {
  const existing = await db.query.jobTracks.findFirst({ where: eq(jobTracks.id, id) });
  if (!existing) {
    if (!upsert) throw httpError(404, 'Annonce introuvable');
    return createJob(db, userId, input, id);
  }
  if (existing.userId !== userId) throw httpError(404, 'Annonce introuvable');

  return db.transaction(async (tx) => {
    const changes = {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.company !== undefined && { company: input.company }),
      ...(input.jobUrl !== undefined && { jobUrl: input.jobUrl }),
      ...(input.appliedAt !== undefined && { appliedAt: input.appliedAt ? new Date(input.appliedAt) : null }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.contractType !== undefined && { contractType: input.contractType }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.offerText !== undefined && { offerText: blankToNull(input.offerText) }),
    };
    const job = Object.keys(changes).length
      ? (await tx.update(jobTracks).set({ ...changes, updatedAt: new Date() }).where(eq(jobTracks.id, id)).returning())[0]!
      : existing;

    let reminder = await tx.query.reminders.findFirst({ where: eq(reminders.jobTrackId, id) });
    const isTerminal = TERMINAL_STATUSES.has(input.status ?? existing.status);

    if (isTerminal && reminder?.isActive) {
      [reminder] = await tx
        .update(reminders)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(reminders.id, reminder.id))
        .returning();
    }

    const hasReminderInput =
      input.frequency !== undefined || input.nextReminderAt !== undefined || input.isActive !== undefined;

    if (hasReminderInput && !isTerminal) {
      if (reminder) {
        [reminder] = await tx
          .update(reminders)
          .set({
            ...(input.frequency !== undefined && { frequency: input.frequency }),
            ...(input.nextReminderAt !== undefined && { nextReminderAt: new Date(input.nextReminderAt) }),
            ...(input.isActive !== undefined && { isActive: input.isActive }),
            updatedAt: new Date(),
          })
          .where(eq(reminders.id, reminder.id))
          .returning();
      } else if (input.frequency !== undefined && input.nextReminderAt) {
        [reminder] = await tx
          .insert(reminders)
          .values({
            jobTrackId: id,
            frequency: input.frequency,
            nextReminderAt: new Date(input.nextReminderAt),
            isActive: input.isActive ?? true,
          })
          .returning();
      }
    }

    // Passage à « Envoyée » sans réglage de relance (Kanban, fiche) : rappel de relancer
    // l'entreprise, à la fréquence existante ou à 7 jours.
    const becomesApplied = input.status === 'APPLIED' && existing.status !== 'APPLIED';
    if (becomesApplied && !hasReminderInput && !reminder?.isActive) {
      const frequency = reminder?.frequency ?? DEFAULT_REMINDER_FREQUENCY_DAYS;
      const next = new Date(Date.now() + frequency * DAY_MS);
      [reminder] = reminder
        ? await tx
            .update(reminders)
            .set({ isActive: true, nextReminderAt: next, updatedAt: new Date() })
            .where(eq(reminders.id, reminder.id))
            .returning()
        : await tx.insert(reminders).values({ jobTrackId: id, frequency, nextReminderAt: next }).returning();
    }

    return toJob({ ...job, reminders: reminder ? [reminder] : [] });
  });
}
