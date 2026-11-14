import type { Db } from './db/client.js';
import type { AuthUser } from './auth/tokens.js';
import type { Mailer } from './mail/mailer.js';
import type { Bucket } from './files/bucket.js';

export type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

// Variables d'environnement du serveur (process.env), assemblées par nodeEnv() ; les
// tests passent leur propre objet. FILES et les limiteurs sont des objets prêts à l'emploi.
export type Bindings = {
  DATABASE_URL: string;
  FILES: Bucket;
  /** Routes sensibles (connexion, inscription, 2FA, reset) : 5 requêtes / min / IP / chemin. */
  STRICT_LIMITER: RateLimiter;
  /** Toutes les routes : 30 requêtes / min / IP / chemin, comme le throttler Nest. */
  GLOBAL_LIMITER: RateLimiter;
  /** Formulaire de contact : 2 messages / min / IP. */
  CONTACT_LIMITER: RateLimiter;
  /** Déduit de APP_ENV ; hors production, l'API peut tourner sans stockage ni envoi d'email. */
  ENVIRONMENT: 'production' | 'development' | 'test';
  ALLOWED_ORIGINS: string;
  /**
   * En-tête où le proxy de confiance écrit l'adresse du visiteur (`cf-connecting-ip` derrière le
   * tunnel Cloudflare). Absent : `x-real-ip`. À ne poser que si rien d'autre que ce proxy ne peut
   * joindre l'API, sinon un client choisirait lui-même l'adresse comptée par les limites de débit.
   */
  CLIENT_IP_HEADER?: string;
  JWT_SECRET: string;
  TOTP_ENCRYPTION_KEY: string;
  /** Envoyé par le service `candidash-cron` dans `Authorization: Bearer …`. */
  CRON_SECRET?: string;
  /** Envoi par l'API de Resend, préféré à SMTP quand il est configuré (avec MAIL_FROM). */
  RESEND_API_KEY?: string;
  /** Adresse de l'expéditeur pour Resend, sur un domaine vérifié. */
  MAIL_FROM?: string;
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
    user: AuthUser;
    /** Présent quand la requête est authentifiée par un jeton d'API (extension). */
    apiTokenId: string;
  };
};
