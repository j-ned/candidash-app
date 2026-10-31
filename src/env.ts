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
  // SMTP (vars, mot de passe en secret) : sans MAIL_USER ni MAIL_PASSWORD, pas d'envoi réel
  MAIL_HOST?: string;
  MAIL_PORT?: string;
  MAIL_USER?: string;
  MAIL_PASSWORD?: string;
  MAIL_FROM_NAME?: string;
  MAIL_FROM_ADDRESS?: string;
  /** Destinataire du formulaire de contact (absent : le formulaire répond 503). */
  CONTACT_RECIPIENT?: string;
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
