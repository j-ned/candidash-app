import type { Bindings } from './env.js';
import { getDb } from './db/client.js';
import { s3Bucket } from './files/bucket.js';
import { dbLimiter } from './rate-limit.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

let cached: Bindings | undefined;

/** Bindings de production, lus une fois dans process.env (variables du projet Vercel). */
export function nodeEnv(): Bindings {
  if (cached) return cached;
  const db = getDb(required('DATABASE_URL'));
  cached = {
    DATABASE_URL: required('DATABASE_URL'),
    FILES: s3Bucket({
      endpoint: required('S3_ENDPOINT'),
      region: process.env.S3_REGION ?? 'auto',
      accessKeyId: required('S3_ACCESS_KEY'),
      secretAccessKey: required('S3_SECRET_KEY'),
      bucket: required('S3_BUCKET'),
    }),
    STRICT_LIMITER: dbLimiter(db, 5),
    GLOBAL_LIMITER: dbLimiter(db, 30),
    CONTACT_LIMITER: dbLimiter(db, 2),
    ENVIRONMENT: process.env.VERCEL_ENV === 'production' ? 'production' : 'development',
    ALLOWED_ORIGINS: required('ALLOWED_ORIGINS'),
    JWT_SECRET: required('JWT_SECRET'),
    TOTP_ENCRYPTION_KEY: required('TOTP_ENCRYPTION_KEY'),
    CRON_SECRET: process.env.CRON_SECRET,
    MAIL_HOST: process.env.MAIL_HOST,
    MAIL_PORT: process.env.MAIL_PORT,
    MAIL_USER: process.env.MAIL_USER,
    MAIL_PASSWORD: process.env.MAIL_PASSWORD,
    MAIL_FROM_NAME: process.env.MAIL_FROM_NAME,
    MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS,
    CONTACT_RECIPIENT: process.env.CONTACT_RECIPIENT,
  };
  return cached;
}
