import { sign, verify } from 'hono/jwt';
import type { Role } from '../db/schema';

const ALG = 'HS256';
export const ACCESS_TTL_S = 24 * 60 * 60;
export const REFRESH_TTL_S = 7 * 24 * 60 * 60;
const TWO_FACTOR_TTL_S = 5 * 60;

export type AccessPayload = { sub: string; email: string; role: Role };

const now = () => Math.floor(Date.now() / 1000);

// Le jeton d'accès n'a pas de `type` ; refresh et 2fa-pending en portent un, et chaque
// vérification exige le sien : aucun jeton ne peut servir à la place d'un autre.
export function signAccess(payload: AccessPayload, secret: string): Promise<string> {
  return sign({ ...payload, iat: now(), exp: now() + ACCESS_TTL_S }, secret, ALG);
}

export function signRefresh(sub: string, secret: string): Promise<string> {
  return sign({ sub, type: 'refresh', iat: now(), exp: now() + REFRESH_TTL_S }, secret, ALG);
}

export function signTwoFactorPending(sub: string, secret: string): Promise<string> {
  return sign({ sub, type: '2fa-pending', iat: now(), exp: now() + TWO_FACTOR_TTL_S }, secret, ALG);
}

async function decode(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    return await verify(token, secret, ALG);
  } catch {
    return null;
  }
}

export async function verifyAccess(token: string, secret: string): Promise<AccessPayload | null> {
  const payload = await decode(token, secret);
  if (!payload || payload.type !== undefined || typeof payload.sub !== 'string') return null;
  return payload as AccessPayload;
}

export async function verifyTyped(
  token: string,
  secret: string,
  type: 'refresh' | '2fa-pending',
): Promise<string | null> {
  const payload = await decode(token, secret);
  return payload?.type === type && typeof payload.sub === 'string' ? payload.sub : null;
}
