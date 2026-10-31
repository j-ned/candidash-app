import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppEnv } from '../env';
import { validate } from '../validate';
import { httpError } from '../http-errors';
import { rateLimit, requireUser } from '../auth/middleware';
import { clearAuthCookies, setAuthCookies } from '../auth/cookies';
import { authenticate, closeSession, openSession, refreshSession } from '../auth/sessions';
import {
  activatePendingUser,
  canResendCode,
  checkVerificationCode,
  createPendingUser,
  hasPendingUser,
  newVerificationCode,
  saveVerificationCode,
} from '../auth/registration';
import { emailOnlySchema, loginSchema, registerSchema, verifyRegistrationSchema } from '../auth/schemas';

export const authRoutes = new Hono<AppEnv>()
  .post('/login', rateLimit('STRICT_LIMITER'), validate('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const result = await authenticate(c.var.db, c.env, email, password);
    if ('requires2FA' in result) return c.json(result);
    const session = await openSession(c.var.db, c.env, result);
    setAuthCookies(c, session);
    return c.json({ user: session.user });
  })

  .post('/refresh', async (c) => {
    const token = getCookie(c, 'refresh_token');
    if (!token) throw httpError(401, 'Jeton de renouvellement introuvable ou invalide dans les cookies');
    setAuthCookies(c, await refreshSession(c.var.db, c.env, token));
    return c.json({ message: 'Jeton renouvelé' });
  })

  .post('/logout', requireUser, async (c) => {
    clearAuthCookies(c);
    await closeSession(c.var.db, c.var.user.sub);
    return c.json({ message: 'Déconnexion réussie' });
  })

  .post('/register', rateLimit('STRICT_LIMITER'), validate('json', registerSchema), async (c) => {
    const data = c.req.valid('json');
    await createPendingUser(c.var.db, data);
    const code = newVerificationCode();
    await saveVerificationCode(c.var.db, data.email, code);
    if (!(await c.var.mailer.sendVerificationCode(data.email, code))) {
      throw httpError(400, "Erreur lors de l'envoi du code de validation");
    }
    return c.json(
      {
        message: 'Code de validation envoyé par email. Veuillez vérifier votre boîte de réception.',
        email: data.email,
      },
      201,
    );
  })

  .post(
    '/verify-registration',
    rateLimit('STRICT_LIMITER'),
    validate('json', verifyRegistrationSchema),
    async (c) => {
      const { email, verificationCode } = c.req.valid('json');
      if (!(await checkVerificationCode(c.var.db, email, verificationCode))) {
        throw httpError(400, 'Code de validation invalide ou expiré');
      }
      const user = await activatePendingUser(c.var.db, email);
      const session = await openSession(c.var.db, c.env, user);
      setAuthCookies(c, session);
      return c.json({ user: session.user });
    },
  )

  .post('/resend-verification', rateLimit('STRICT_LIMITER'), validate('json', emailOnlySchema), async (c) => {
    const { email } = c.req.valid('json');
    if (!(await canResendCode(c.var.db, email))) {
      throw httpError(400, 'Veuillez attendre au moins une minute avant de demander un nouveau code');
    }
    if (!(await hasPendingUser(c.var.db, email))) {
      throw httpError(400, 'Aucune inscription en attente pour cet email');
    }
    const code = newVerificationCode();
    await saveVerificationCode(c.var.db, email, code);
    if (!(await c.var.mailer.sendVerificationCode(email, code))) {
      throw httpError(400, "Erreur lors de l'envoi du code de validation");
    }
    return c.json({ message: 'Nouveau code de validation envoyé par email' });
  });
