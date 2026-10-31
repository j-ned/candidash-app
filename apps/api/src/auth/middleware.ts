import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { and, eq } from 'drizzle-orm';
import type { AppEnv } from '../env';
import { apiTokens, users, type Role } from '../db/schema';
import { httpError } from '../http-errors';
import { verifyAccess } from './tokens';
import { sha256Hex } from './crypto';
import { activeApiToken } from '../api-tokens/active-api-token';

/** Session web : jeton d'accès dans le cookie HttpOnly `access_token`, jamais en en-tête. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, 'access_token');
  if (!token) throw httpError(401, "Jeton d'authentification manquant");
  const payload = await verifyAccess(token, c.env.JWT_SECRET);
  if (!payload) throw httpError(401, "Jeton d'authentification invalide");
  c.set('user', payload);
  await next();
});

/** À placer après requireUser : le rôle est relu en base, le claim du JWT peut être périmé. */
export function requireRole(role: Role) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const row = await c.var.db.query.users.findFirst({
      columns: { role: true },
      where: eq(users.id, c.var.user.sub),
    });
    if (row?.role !== role) throw httpError(403, 'Accès réservé aux administrateurs');
    await next();
  });
}

/** Extension navigateur : `Authorization: Bearer ctok_…`, ni révoqué ni expiré. */
export const requireApiToken = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw httpError(401, "Jeton d'API manquant");

  const [row] = await c.var.db
    .select({ id: apiTokens.id, userId: apiTokens.userId })
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, await sha256Hex(token)), activeApiToken()))
    .limit(1);
  if (!row) throw httpError(401, "Jeton d'API invalide, révoqué ou expiré");

  await c.var.db
    .update(apiTokens)
    .set({ derniereUtilisation: new Date() })
    .where(eq(apiTokens.id, row.id));
  // Seul `sub` sert aux routes appelées par l'extension
  c.set('user', { sub: row.userId, email: '', role: 'USER' });
  c.set('apiTokenId', row.id);
  await next();
});

/** Adresse du visiteur : Vercel la place dans x-real-ip (et en tête de x-forwarded-for). */
export function clientIp(c: Context<AppEnv>): string {
  return c.req.header('x-real-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
}

/** Limite par IP et par chemin (clé `limiteur:ip:méthode:chemin`), comme le throttler Nest. */
export function rateLimit(limiter: 'STRICT_LIMITER' | 'GLOBAL_LIMITER' | 'CONTACT_LIMITER') {
  return createMiddleware<AppEnv>(async (c, next) => {
    const ip = clientIp(c) || 'local';
    const { success } = await c.env[limiter].limit({
      // Préfixe du limiteur : global et strict comptent séparément pour une même route
      key: `${limiter}:${ip}:${c.req.method}:${c.req.path}`,
    });
    if (!success) throw httpError(429, 'Trop de requêtes, réessayez dans une minute');
    await next();
  });
}
