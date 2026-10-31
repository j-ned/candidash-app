import { Hono } from 'hono';
import type { AppEnv } from '../env.js';
import { validate } from '../validate.js';
import { httpError } from '../http-errors.js';
import { rateLimit, requireUser } from '../auth/middleware.js';
import { setAuthCookies } from '../auth/cookies.js';
import { completeTwoFactor, openSession, twoFactorUser } from '../auth/sessions.js';
import { consumeRecoveryCode, disableTotp, enableTotp, startTotpSetup, verifyTotp } from '../auth/two-factor.js';
import { checkPassword, findUserById } from '../users/users.js';
import { disableTotpSchema, recoverySchema, totpTokenSchema, validateTotpSchema } from '../auth/schemas.js';

export const twoFactorRoutes = new Hono<AppEnv>()
  .post('/setup', requireUser, async (c) => {
    const user = await findUserById(c.var.db, c.var.user.sub);
    if (!user) throw httpError(401, 'Utilisateur introuvable');
    // Remplacer le secret d'une 2FA active bloquerait l'utilisateur : il doit d'abord la désactiver
    if (user.totpEnabled) throw httpError(400, 'La 2FA est déjà activée');
    return c.json(await startTotpSetup(c.var.db, user, c.env.TOTP_ENCRYPTION_KEY));
  })

  .post('/verify-setup', requireUser, validate('json', totpTokenSchema), async (c) => {
    const user = await findUserById(c.var.db, c.var.user.sub);
    if (!user?.totpSecret) {
      throw httpError(400, 'Aucun secret TOTP configuré. Veuillez relancer la configuration.');
    }
    if (!(await verifyTotp(user.totpSecret, c.req.valid('json').token, c.env.TOTP_ENCRYPTION_KEY))) {
      throw httpError(400, 'Code TOTP invalide');
    }
    return c.json({ recoveryCodes: await enableTotp(c.var.db, user.id) });
  })

  .post('/disable', requireUser, validate('json', disableTotpSchema), async (c) => {
    const user = await findUserById(c.var.db, c.var.user.sub);
    if (!user) throw httpError(401, 'Utilisateur introuvable');
    if (!(await checkPassword(c.var.db, user, c.req.valid('json').password))) {
      throw httpError(401, 'Mot de passe invalide');
    }
    await disableTotp(c.var.db, user.id);
    return c.json({ message: '2FA désactivée avec succès' });
  })

  .post('/validate', rateLimit('STRICT_LIMITER'), validate('json', validateTotpSchema), async (c) => {
    const { tempToken, token } = c.req.valid('json');
    const user = await completeTwoFactor(c.var.db, c.env, tempToken, token);
    const session = await openSession(c.var.db, c.env, user);
    setAuthCookies(c, session);
    return c.json({ user: session.user });
  })

  .post('/recovery', rateLimit('STRICT_LIMITER'), validate('json', recoverySchema), async (c) => {
    const { tempToken, recoveryCode } = c.req.valid('json');
    const user = await twoFactorUser(c.var.db, c.env, tempToken);
    if (!(await consumeRecoveryCode(c.var.db, user, recoveryCode))) {
      throw httpError(401, 'Code de récupération invalide');
    }
    const session = await openSession(c.var.db, c.env, user);
    setAuthCookies(c, session);
    return c.json({ user: session.user });
  });
