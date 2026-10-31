import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { sql } from 'drizzle-orm';
import type { AppEnv, Bindings } from './env.js';
import { getDb } from './db/client.js';
import { nodeEnv } from './node-env.js';
import { errorBody, handleError } from './http-errors.js';
import { rateLimit } from './auth/middleware.js';
import { consoleMailer, templatedMailer, unavailableMailer, type Mailer } from './mail/mailer.js';
import { smtpTransport } from './mail/smtp.js';
import { authRoutes } from './routes/auth.js';
import { twoFactorRoutes } from './routes/two-factor.js';
import { apiTokenRoutes } from './routes/api-tokens.js';
import { accountRoutes } from './routes/accounts.js';
import { jobTrackRoutes } from './routes/jobtrack.js';
import { jobFileRoutes } from './routes/job-files.js';
import { documentRoutes } from './routes/documents.js';
import { analyticsRoutes } from './routes/analytics.js';
import { adminRoutes } from './routes/admin.js';
import { contactRoutes } from './routes/contact.js';
import { cronRoutes } from './routes/cron.js';

// SMTP dès qu'il est configuré ; sinon la console en local, et aucun envoi en production.
export function defaultMailer(env: Bindings): Mailer {
  if (env.MAIL_HOST && env.MAIL_USER && env.MAIL_PASSWORD) return templatedMailer(smtpTransport(env));
  return env.ENVIRONMENT === 'production' ? unavailableMailer : consoleMailer;
}

export type AppOptions = { mailer?: (env: Bindings) => Mailer };

export function createApp({ mailer = defaultMailer }: AppOptions = {}) {
  const app = new Hono<AppEnv>().basePath('/api/v1');

  // Sur Vercel, l'app reçoit la requête seule : les bindings viennent de process.env. Les tests
  // passent les leurs à app.request().
  app.use(async (c, next) => {
    if (!c.env?.JWT_SECRET) c.env = nodeEnv();
    await next();
  });

  app.use(secureHeaders());

  app.use((c, next) =>
    cors({
      origin: c.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
      // Nom du fichier des exports, lu par le front pour le téléchargement
      exposeHeaders: ['Content-Disposition'],
    })(c, next),
  );

  // /health n'est pas limité (sondes de disponibilité)
  app.use((c, next) =>
    c.req.path.endsWith('/health') ? next() : rateLimit('GLOBAL_LIMITER')(c, next),
  );

  app.use(async (c, next) => {
    c.set('db', getDb(c.env.DATABASE_URL));
    await next();
  });

  app.use(async (c, next) => {
    c.set('mailer', mailer(c.env));
    await next();
  });

  app.get('/health', async (c) => {
    await c.var.db.execute(sql`select 1`);
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.route('/auth', authRoutes);
  app.route('/auth/2fa', twoFactorRoutes);
  app.route('/api-tokens', apiTokenRoutes);
  app.route('/accounts', accountRoutes);
  app.route('/jobtrack', jobTrackRoutes);
  app.route('/jobtrack', jobFileRoutes);
  app.route('/documents', documentRoutes);
  app.route('/analytics', analyticsRoutes);
  app.route('/admin', adminRoutes);
  app.route('/contact', contactRoutes);
  app.route('/cron', cronRoutes);

  app.notFound((c) => c.json(errorBody(404, `Cannot ${c.req.method} ${c.req.path}`), 404));
  app.onError(handleError);

  return app;
}
