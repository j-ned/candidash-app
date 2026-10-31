import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import type { AppEnv } from '../env.js';
import type { Db } from '../db/client.js';
import { apiTokens, type ApiTokenRow } from '../db/schema.js';
import { validate } from '../validate.js';
import { httpError } from '../http-errors.js';
import { rateLimit, requireApiToken, requireUser } from '../auth/middleware.js';
import { randomHex, sha256Hex } from '../auth/crypto.js';
import { authenticate, completeTwoFactor } from '../auth/sessions.js';
import { activeApiToken } from '../api-tokens/active-api-token.js';
import { createApiTokenSchema, login2faApiTokenSchema, loginApiTokenSchema } from '../auth/schemas.js';

const toApiToken = (row: ApiTokenRow) => ({
  id: row.id,
  nomAffiche: row.nomAffiche,
  createdAt: row.createdAt,
  derniereUtilisation: row.derniereUtilisation ?? undefined,
});

/** Le secret n'est renvoyé qu'ici, une seule fois ; seul son SHA-256 est gardé. */
async function createToken(db: Db, userId: string, nomAffiche: string) {
  const token = `ctok_${randomHex(32)}`;
  const [row] = await db
    .insert(apiTokens)
    .values({ userId, nomAffiche, tokenHash: await sha256Hex(token) })
    .returning();
  return { ...toApiToken(row!), token };
}

async function revoke(db: Db, id: string, userId: string): Promise<void> {
  const row = await db.query.apiTokens.findFirst({ where: eq(apiTokens.id, id) });
  if (!row) throw httpError(404, "Jeton d'API introuvable");
  if (row.userId !== userId) throw httpError(403, "Accès refusé à ce jeton d'API");
  await db.update(apiTokens).set({ revokedAt: new Date() }).where(eq(apiTokens.id, id));
}

export const apiTokenRoutes = new Hono<AppEnv>()
  .post('/', requireUser, validate('json', createApiTokenSchema), async (c) =>
    c.json(await createToken(c.var.db, c.var.user.sub, c.req.valid('json').nomAffiche), 201),
  )

  .get('/', requireUser, async (c) => {
    const rows = await c.var.db
      .select()
      .from(apiTokens)
      .where(and(eq(apiTokens.userId, c.var.user.sub), activeApiToken()))
      .orderBy(desc(apiTokens.createdAt));
    return c.json(rows.map(toApiToken));
  })

  // Déconnexion de l'extension : elle révoque son propre jeton
  .delete('/me', requireApiToken, async (c) => {
    await revoke(c.var.db, c.var.apiTokenId, c.var.user.sub);
    return c.json({ message: 'Jeton révoqué' });
  })

  .delete('/:id', requireUser, async (c) => {
    await revoke(c.var.db, c.req.param('id'), c.var.user.sub);
    return c.json({ message: 'Jeton révoqué' });
  })

  // Connexion depuis l'extension : identifiants → jeton d'API (ou étape 2FA)
  .post('/login', rateLimit('STRICT_LIMITER'), validate('json', loginApiTokenSchema), async (c) => {
    const { email, password, nomAffiche } = c.req.valid('json');
    const result = await authenticate(c.var.db, c.env, email, password);
    if ('requires2FA' in result) return c.json(result);
    return c.json({ ...(await createToken(c.var.db, result.id, nomAffiche)), user: { email: result.email } });
  })

  .post('/login/2fa', rateLimit('STRICT_LIMITER'), validate('json', login2faApiTokenSchema), async (c) => {
    const { tempToken, token, nomAffiche } = c.req.valid('json');
    const user = await completeTwoFactor(c.var.db, c.env, tempToken, token);
    return c.json({ ...(await createToken(c.var.db, user.id, nomAffiche)), user: { email: user.email } });
  });
