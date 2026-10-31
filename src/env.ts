import type { Db } from './db/client';
import type { AccessPayload } from './auth/tokens';
import type { Mailer } from './mail/mailer';

type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

// Bindings déclarés dans wrangler.jsonc ; secrets posés par `wrangler secret put`.
export type Bindings = {
  HYPERDRIVE: { connectionString: string };
  FILES: R2Bucket;
  /** Routes sensibles (connexion, inscription, 2FA, reset) : 5 requêtes / min / IP / route. */
  STRICT_LIMITER: RateLimiter;
  /** Toutes les routes : 30 requêtes / min / IP / route, comme le throttler Nest. */
  GLOBAL_LIMITER: RateLimiter;
  ENVIRONMENT: 'production' | 'development' | 'test';
  ALLOWED_ORIGINS: string;
  JWT_SECRET: string;
  TOTP_ENCRYPTION_KEY: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    db: Db;
    mailer: Mailer;
    user: AccessPayload;
    /** Présent quand la requête est authentifiée par un jeton d'API (extension). */
    apiTokenId: string;
  };
};
