import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { users, type UserRow } from '../db/schema';
import { hashPassword, verifyPassword } from '../auth/passwords';

export type UserSafe = Pick<UserRow, 'id' | 'email' | 'role' | 'totpEnabled' | 'createdAt' | 'updatedAt'> & {
  username?: string;
};

/** Forme publique d'un utilisateur : jamais de mot de passe, secret TOTP ni jeton. */
export function toSafeUser(row: UserRow): UserSafe {
  return {
    id: row.id,
    email: row.email,
    username: row.username ?? undefined,
    role: row.role,
    totpEnabled: row.totpEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function findUserByEmail(db: Db, email: string): Promise<UserRow | undefined> {
  return db.query.users.findFirst({ where: eq(users.email, email) });
}

export function findUserById(db: Db, id: string): Promise<UserRow | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

/** Vérifie le mot de passe et migre au passage un ancien hachage (bcrypt, SHA-256) en argon2id. */
export async function checkPassword(db: Db, user: UserRow, password: string): Promise<boolean> {
  if (!user.password) return false;
  const { valid, needsRehash } = await verifyPassword(user.password, password);
  if (valid && needsRehash) {
    await db
      .update(users)
      .set({ password: await hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }
  return valid;
}
