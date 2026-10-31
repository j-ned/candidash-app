import { and, eq, gte, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { apiTokens, users } from '../db/schema';
import { randomHex, sha256Hex } from '../auth/crypto';
import { hashPassword } from '../auth/passwords';
import { closeSession } from '../auth/sessions';

const RESET_TTL_MS = 60 * 60 * 1000;

/** Lien de réinitialisation valable 1 h ; seul son SHA-256 est gardé en base. */
export async function createResetToken(db: Db, userId: string): Promise<string> {
  const token = randomHex(32);
  await db
    .update(users)
    .set({
      resetPasswordToken: await sha256Hex(token),
      resetPasswordExpires: new Date(Date.now() + RESET_TTL_MS),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  return token;
}

/** Après un changement de mot de passe, toute session ouverte avec l'ancien est coupée. */
async function revokeSessions(db: Db, userId: string): Promise<void> {
  await closeSession(db, userId);
  await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)));
}

export async function setPassword(db: Db, userId: string, password: string): Promise<void> {
  await db
    .update(users)
    .set({ password: await hashPassword(password), updatedAt: new Date() })
    .where(eq(users.id, userId));
  await revokeSessions(db, userId);
}

/** Token à usage unique : vrai si le mot de passe a été remplacé. */
export async function resetWithToken(db: Db, token: string, password: string): Promise<boolean> {
  const row = await db.query.users.findFirst({
    columns: { id: true },
    where: and(eq(users.resetPasswordToken, await sha256Hex(token)), gte(users.resetPasswordExpires, new Date())),
  });
  if (!row) return false;
  await db
    .update(users)
    .set({ resetPasswordToken: null, resetPasswordExpires: null })
    .where(eq(users.id, row.id));
  await setPassword(db, row.id, password);
  return true;
}
