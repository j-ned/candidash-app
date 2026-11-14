import type { Bindings } from './env.js';
import { getDb } from './db/client.js';
import { disabledBucket, s3Bucket, type Bucket } from './files/bucket.js';
import { dbLimiter } from './rate-limit.js';

type Vars = Readonly<Record<string, string | undefined>>;

// Sur Vercel, VERCEL_ENV est posé par la plateforme (et non par une variable du projet) : une
// preview ne peut pas se déclarer production par erreur de configuration, APP_ENV y est ignoré.
// Hors Vercel, l'image Docker de production déclare APP_ENV=production (apps/api/Dockerfile).
function environment(vars: Vars): Bindings['ENVIRONMENT'] {
  if (vars.VERCEL_ENV === 'production') return 'production';
  if (vars.VERCEL_ENV === 'preview') return 'preview';
  if (vars.VERCEL_ENV === undefined && vars.APP_ENV === 'production') return 'production';
  return 'development';
}

const SENDER_ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

let cached: Bindings | undefined;

/** Bindings de production, lus une fois dans process.env (variables du projet Vercel). */
export function nodeEnv(): Bindings {
  cached ??= readBindings(process.env);
  return cached;
}

export function readBindings(vars: Vars): Bindings {
  const required = (name: string): string => {
    const value = vars[name];
    if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
    return value;
  };
  const env = environment(vars);
  // En production, sans envoi d'email, inscriptions et réinitialisations seraient silencieusement
  // cassées : il faut Resend (clé et expéditeur) ou, à défaut, SMTP.
  if (vars.RESEND_API_KEY) {
    if (!SENDER_ADDRESS.test(required('MAIL_FROM'))) throw new Error('MAIL_FROM doit être une adresse email seule');
  } else if (env === 'production') {
    ['MAIL_HOST', 'MAIL_USER', 'MAIL_PASSWORD'].forEach(required);
  }
  // Hors production, le stockage est facultatif : sans bucket, les routes de fichiers répondent 503
  const files: Bucket =
    env !== 'production' && !vars.S3_BUCKET
      ? disabledBucket
      : s3Bucket({
          endpoint: required('S3_ENDPOINT'),
          region: vars.S3_REGION ?? 'auto',
          accessKeyId: required('S3_ACCESS_KEY'),
          secretAccessKey: required('S3_SECRET_KEY'),
          bucket: required('S3_BUCKET'),
        });
  const db = getDb(required('DATABASE_URL'));
  return {
    DATABASE_URL: required('DATABASE_URL'),
    FILES: files,
    STRICT_LIMITER: dbLimiter(db, 5),
    GLOBAL_LIMITER: dbLimiter(db, 30),
    CONTACT_LIMITER: dbLimiter(db, 2),
    ENVIRONMENT: env,
    ALLOWED_ORIGINS: required('ALLOWED_ORIGINS'),
    CLIENT_IP_HEADER: vars.CLIENT_IP_HEADER || undefined,
    JWT_SECRET: required('JWT_SECRET'),
    TOTP_ENCRYPTION_KEY: required('TOTP_ENCRYPTION_KEY'),
    CRON_SECRET: vars.CRON_SECRET,
    RESEND_API_KEY: vars.RESEND_API_KEY,
    MAIL_FROM: vars.MAIL_FROM,
    MAIL_HOST: vars.MAIL_HOST,
    MAIL_PORT: vars.MAIL_PORT,
    MAIL_USER: vars.MAIL_USER,
    MAIL_PASSWORD: vars.MAIL_PASSWORD,
    MAIL_FROM_NAME: vars.MAIL_FROM_NAME,
    MAIL_FROM_ADDRESS: vars.MAIL_FROM_ADDRESS,
    CONTACT_RECIPIENT: vars.CONTACT_RECIPIENT,
  };
}
