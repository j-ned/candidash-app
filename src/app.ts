import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { sql } from 'drizzle-orm';
import type { AppEnv, Bindings } from './env';
import { openDb } from './db/client';
import { errorBody, handleError } from './http-errors';
import { rateLimit } from './auth/middleware';
import { consoleMailer, type Mailer } from './mail/mailer';
import { authRoutes } from './routes/auth';
import { twoFactorRoutes } from './routes/two-factor';
import { apiTokenRoutes } from './routes/api-tokens';

// En production sans SMTP branché, aucun code ne doit finir dans les logs : l'envoi échoue.
const unavailableMailer: Mailer = { sendVerificationCode: async () => false };

function defaultMailer(env: Bindings): Mailer {
  return env.ENVIRONMENT === 'production' ? unavailableMailer : consoleMailer;
}

export type AppOptions = { mailer?: (env: Bindings) => Mailer };

export function createApp({ mailer = defaultMailer }: AppOptions = {}) {
  const app = new Hono<AppEnv>().basePath('/api/v1');

  app.use(secureHeaders());

  // Origines lues dans les vars du Worker (bindings disponibles seulement par requête)
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

  // Avant d'ouvrir la base : une requête refusée ne coûte pas de connexion. /health n'est pas
  // limité (sondes de disponibilité).
  app.use((c, next) =>
    c.req.path.endsWith('/health') ? next() : rateLimit('GLOBAL_LIMITER')(c, next),
  );

  app.use(async (c, next) => {
    const { db, close } = await openDb(c.env.HYPERDRIVE.connectionString);
    c.set('db', db);
    try {
      await next();
    } finally {
      // La connexion se ferme après l'envoi de la réponse, sans la retarder
      c.executionCtx.waitUntil(close());
    }
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

  app.notFound((c) => c.json(errorBody(404, `Cannot ${c.req.method} ${c.req.path}`), 404));
  app.onError(handleError);

  return app;
}
