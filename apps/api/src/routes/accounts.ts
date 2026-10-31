import { Hono } from 'hono';
import { and, eq, ne } from 'drizzle-orm';
import type { AppEnv } from '../env.js';
import { jobTracks, users } from '../db/schema.js';
import { validate } from '../validate.js';
import { httpError } from '../http-errors.js';
import { rateLimit, requireUser } from '../auth/middleware.js';
import { checkPassword, findUserByEmail, findUserById, toSafeUser } from '../users/users.js';
import { createResetToken, resetWithToken, setPassword } from '../users/passwords-reset.js';
import { deleteJobFiles } from '../files/job-files.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../users/schemas.js';

/** Un utilisateur n'agit que sur son propre compte. */
function ownAccount(id: string, userId: string, message: string): void {
  if (id !== userId) throw httpError(403, message);
}

export const accountRoutes = new Hono<AppEnv>()
  .get('/profile/:id', requireUser, async (c) => {
    ownAccount(c.req.param('id'), c.var.user.sub, 'Accès refusé à ce profil');
    const user = await findUserById(c.var.db, c.var.user.sub);
    if (!user) throw httpError(404, 'Utilisateur introuvable');
    return c.json(toSafeUser(user));
  })

  .put('/profile-update/:id', requireUser, validate('json', updateProfileSchema), async (c) => {
    ownAccount(c.req.param('id'), c.var.user.sub, 'Vous ne pouvez modifier que votre propre profil');
    const { email, username, currentPassword } = c.req.valid('json');
    const user = await findUserById(c.var.db, c.var.user.sub);
    if (!user) throw httpError(404, 'Utilisateur introuvable');

    // Une session volée ne doit pas suffire à détourner le compte
    if (email && email !== user.email) {
      if (currentPassword === undefined || !(await checkPassword(c.var.db, user, currentPassword))) {
        throw httpError(401, "Mot de passe actuel requis pour changer d'email");
      }
      const taken = await c.var.db.query.users.findFirst({
        columns: { id: true },
        where: and(eq(users.email, email), ne(users.id, user.id)),
      });
      if (taken) throw httpError(409, 'Un utilisateur avec cet email existe déjà');
    }

    const [updated] = await c.var.db
      .update(users)
      .set({
        ...(email && { email }),
        ...(username !== undefined && { username }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    return c.json(toSafeUser(updated!));
  })

  .delete('/deactivation/:id', requireUser, async (c) => {
    ownAccount(c.req.param('id'), c.var.user.sub, 'Vous ne pouvez supprimer que votre propre profil');
    const userId = c.var.user.sub;
    // Les PDF partent du stockage avant le compte (RGPD) : la base ne les référence plus après
    const jobs = await c.var.db.query.jobTracks.findMany({
      columns: { id: true, cvFileName: true, lmFileName: true },
      where: eq(jobTracks.userId, userId),
    });
    await deleteJobFiles(c.env.FILES, userId, jobs);
    const [deleted] = await c.var.db.delete(users).where(eq(users.id, userId)).returning();
    if (!deleted) throw httpError(404, 'Utilisateur introuvable');
    return c.json(toSafeUser(deleted));
  })

  .post('/forgot-password', rateLimit('STRICT_LIMITER'), validate('json', forgotPasswordSchema), async (c) => {
    const user = await findUserByEmail(c.var.db, c.req.valid('json').email);
    if (user) {
      const token = await createResetToken(c.var.db, user.id);
      // Le lien pointe vers la première origine autorisée : le front
      const frontendUrl = c.env.ALLOWED_ORIGINS.split(',')[0]!.trim();
      await c.var.mailer.sendPasswordReset({
        email: user.email,
        userName: user.username ?? undefined,
        resetUrl: `${frontendUrl}/auth/reset-password?token=${token}`,
      });
    }
    // Même réponse que le compte existe ou non : pas d'énumération des emails
    return c.json({ message: 'Si votre email existe, vous recevrez les instructions de réinitialisation' });
  })

  .post('/reset-password', rateLimit('STRICT_LIMITER'), validate('json', resetPasswordSchema), async (c) => {
    const { token, newPassword } = c.req.valid('json');
    if (!(await resetWithToken(c.var.db, token, newPassword))) {
      throw httpError(400, 'Token invalide ou expiré');
    }
    return c.json({ message: 'Mot de passe réinitialisé avec succès' });
  })

  .put('/change-password', requireUser, validate('json', changePasswordSchema), async (c) => {
    const { currentPassword, newPassword } = c.req.valid('json');
    const user = await findUserById(c.var.db, c.var.user.sub);
    if (!user || !(await checkPassword(c.var.db, user, currentPassword))) {
      throw httpError(401, 'Mot de passe actuel incorrect');
    }
    await setPassword(c.var.db, user.id, newPassword);
    await c.var.mailer.sendPasswordChanged({ email: user.email, userName: user.username ?? undefined });
    return c.json({ message: 'Mot de passe modifié avec succès' });
  });
