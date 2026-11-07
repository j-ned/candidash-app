import { eq, ne } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { documents, jobTracks, reminders, users } from '../db/schema.js';
import { hashPassword } from '../auth/passwords.js';

// Données fictives uniquement (domaine réservé .test) : la base de preview ne reçoit jamais de copie
// de production.
export const DEMO_EMAIL = 'demo@demo.candidash.test';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Garde-fou : le seed ne touche qu'une base vide ou déjà réservée à la démo. Une base qui contient
 * un autre compte (production, copie) est refusée avant toute écriture.
 */
export async function assertDemoOnlyDatabase(db: Db): Promise<void> {
  const others = await db.select({ id: users.id }).from(users).where(ne(users.email, DEMO_EMAIL)).limit(1);
  if (others.length) {
    throw new Error('Base refusée : elle contient des compte(s) hors démo (production ou copie ?)');
  }
}

/** Compte de démo et ses candidatures, recréés à l'identique à chaque exécution. */
export async function seedDemo(db: Db, password: string): Promise<void> {
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: DEMO_EMAIL, username: 'Démo', password: hash, role: 'USER' })
      .onConflictDoUpdate({ target: users.email, set: { password: hash, updatedAt: new Date() } })
      .returning({ id: users.id });
    if (!user) throw new Error('Compte de démo non créé');

    // Les relances suivent leurs candidatures (cascade)
    await tx.delete(jobTracks).where(eq(jobTracks.userId, user.id));
    await tx.delete(documents).where(eq(documents.userId, user.id));

    const now = Date.now();
    const jobs = await tx
      .insert(jobTracks)
      .values([
        { userId: user.id, title: 'Développeur Angular', company: 'Exemple SA', status: 'TO_APPLY', contractType: 'CDI' },
        {
          userId: user.id,
          title: 'Développeur full-stack TypeScript',
          company: 'Démo SARL',
          status: 'APPLIED',
          contractType: 'CDI',
          appliedAt: new Date(now - 5 * DAY_MS),
        },
        {
          userId: user.id,
          title: 'Ingénieur front-end',
          company: 'Fictive & Cie',
          status: 'INTERVIEW',
          contractType: 'FREELANCE',
          appliedAt: new Date(now - 12 * DAY_MS),
          notes: 'Entretien technique prévu (données de démonstration).',
        },
        {
          userId: user.id,
          title: 'Développeur web',
          company: 'Imaginaire SAS',
          status: 'REJECTED',
          contractType: 'CDD',
          appliedAt: new Date(now - 30 * DAY_MS),
        },
      ])
      .returning({ id: jobTracks.id, status: jobTracks.status });

    const applied = jobs.find((job) => job.status === 'APPLIED');
    if (applied) {
      await tx
        .insert(reminders)
        .values({ jobTrackId: applied.id, frequency: 7, nextReminderAt: new Date(now + 2 * DAY_MS) });
    }
    await tx.insert(documents).values({
      userId: user.id,
      kind: 'CV',
      title: 'CV de démonstration',
      markdown: '# Camille Démo\n\nDéveloppeuse TypeScript (profil fictif).\n',
    });
  });
}
