import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import type { Bindings } from '../env';
import { users, type UserRow } from '../db/schema';
import { httpError } from '../http-errors';
import { sha256Hex, timingSafeEqualHex } from './crypto';
import { REFRESH_TTL_S, signAccess, signRefresh, signTwoFactorPending, verifyTyped } from './tokens';
import { checkPassword, findUserByEmail, findUserById, toSafeUser } from '../users/users';
import { verifyTotp } from './two-factor';

export type TwoFactorPending = { requires2FA: true; tempToken: string; message: string };

/** Ouvre une session : jetons signés, et seul le hachage du refresh est gardé (rotation). */
export async function openSession(db: Db, env: Bindings, user: UserRow) {
  const accessToken = await signAccess({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET);
  const refreshToken = await signRefresh(user.id, env.JWT_SECRET);
  await db
    .update(users)
    .set({
      refreshToken: await sha256Hex(refreshToken),
      refreshTokenExpires: new Date(Date.now() + REFRESH_TTL_S * 1000),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  return { accessToken, refreshToken, user: toSafeUser(user) };
}

/** Email + mot de passe : l'utilisateur, ou un jeton temporaire si la 2FA est activée. */
export async function authenticate(
  db: Db,
  env: Bindings,
  email: string,
  password: string,
): Promise<UserRow | TwoFactorPending> {
  const user = await findUserByEmail(db, email);
  if (!user || !(await checkPassword(db, user, password))) {
    throw httpError(401, 'Identifiants invalides');
  }
  if (user.totpEnabled) {
    return {
      requires2FA: true,
      tempToken: await signTwoFactorPending(user.id, env.JWT_SECRET),
      message: 'Vérification 2FA requise',
    };
  }
  return user;
}

/** Utilisateur du jeton temporaire 2FA, sous réserve que la 2FA soit toujours active. */
export async function twoFactorUser(db: Db, env: Bindings, tempToken: string): Promise<UserRow> {
  const sub = await verifyTyped(tempToken, env.JWT_SECRET, '2fa-pending');
  if (!sub) throw httpError(401, 'Jeton temporaire invalide ou expiré');
  const user = await findUserById(db, sub);
  if (!user?.totpEnabled || !user.totpSecret) {
    throw httpError(401, '2FA non activée pour cet utilisateur');
  }
  return user;
}

export async function completeTwoFactor(db: Db, env: Bindings, tempToken: string, code: string): Promise<UserRow> {
  const user = await twoFactorUser(db, env, tempToken);
  if (!(await verifyTotp(user.totpSecret!, code, env.TOTP_ENCRYPTION_KEY))) {
    throw httpError(401, 'Code TOTP invalide');
  }
  return user;
}

/** Échange un refresh token contre une nouvelle session ; l'ancien devient invalide. */
export async function refreshSession(db: Db, env: Bindings, refreshToken: string) {
  const sub = await verifyTyped(refreshToken, env.JWT_SECRET, 'refresh');
  if (!sub) throw httpError(401, 'Jeton de renouvellement invalide');
  const user = await findUserById(db, sub);
  const stillValid =
    user?.refreshToken &&
    user.refreshTokenExpires &&
    user.refreshTokenExpires > new Date() &&
    timingSafeEqualHex(user.refreshToken, await sha256Hex(refreshToken));
  if (!user || !stillValid) throw httpError(401, 'Jeton de renouvellement invalide');
  return openSession(db, env, user);
}

export async function closeSession(db: Db, userId: string): Promise<void> {
  await db
    .update(users)
    .set({ refreshToken: null, refreshTokenExpires: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
