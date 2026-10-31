import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { pendingUsers, users, verificationCodes } from '../db/schema';
import { httpError } from '../http-errors';
import { hashPassword } from './passwords';
import { findUserByEmail } from '../users/users';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_DELAY_MS = 60 * 1000;

/** Code à 6 chiffres (biais du modulo négligeable : 900 000 valeurs sur 2^32). */
export function newVerificationCode(): string {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (n! % 900000));
}

/** Inscription en attente de vérification : le mot de passe est déjà haché. */
export async function createPendingUser(
  db: Db,
  data: { email: string; password: string; username?: string },
): Promise<void> {
  if (await findUserByEmail(db, data.email)) {
    throw httpError(409, 'Un utilisateur avec cet email existe déjà');
  }
  const values = {
    password: await hashPassword(data.password),
    username: data.username,
    verified: false,
    updatedAt: new Date(),
  };
  await db
    .insert(pendingUsers)
    .values({ email: data.email, ...values })
    .onConflictDoUpdate({ target: pendingUsers.email, set: values });
}

export async function hasPendingUser(db: Db, email: string): Promise<boolean> {
  return Boolean(await db.query.pendingUsers.findFirst({ where: eq(pendingUsers.email, email) }));
}

export async function saveVerificationCode(db: Db, email: string, code: string): Promise<void> {
  const values = { code, expiresAt: new Date(Date.now() + CODE_TTL_MS), attempts: 0, updatedAt: new Date() };
  await db
    .insert(verificationCodes)
    .values({ email, ...values })
    .onConflictDoUpdate({ target: verificationCodes.email, set: values });
}

/** Un nouvel envoi n'est possible qu'une minute après le précédent. */
export async function canResendCode(db: Db, email: string): Promise<boolean> {
  const row = await db.query.verificationCodes.findFirst({ where: eq(verificationCodes.email, email) });
  return !row || row.updatedAt.getTime() <= Date.now() - RESEND_DELAY_MS;
}

/** 5 essais par code, 10 minutes de validité ; un code juste est consommé. */
export async function checkVerificationCode(db: Db, email: string, code: string): Promise<boolean> {
  const row = await db.query.verificationCodes.findFirst({ where: eq(verificationCodes.email, email) });
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;
  if (row.expiresAt < new Date()) {
    await db.delete(verificationCodes).where(eq(verificationCodes.email, email));
    return false;
  }
  if (row.code === code) {
    await db.delete(verificationCodes).where(eq(verificationCodes.email, email));
    return true;
  }
  await db
    .update(verificationCodes)
    .set({ attempts: row.attempts + 1, updatedAt: new Date() })
    .where(eq(verificationCodes.email, email));
  return false;
}

/** Transforme l'inscription en attente en vrai compte (rôle USER). */
export async function activatePendingUser(db: Db, email: string) {
  const pending = await db.query.pendingUsers.findFirst({ where: eq(pendingUsers.email, email) });
  if (!pending) throw httpError(400, 'Aucune inscription en attente pour cet email');
  const [user] = await db
    .insert(users)
    .values({ email: pending.email, username: pending.username, password: pending.password, role: 'USER' })
    .returning();
  await db.delete(pendingUsers).where(eq(pendingUsers.email, email));
  return user!;
}
