import type { Db } from './db/client';

// Bindings déclarés dans wrangler.jsonc ; secrets posés par `wrangler secret put`.
export type Bindings = {
  HYPERDRIVE: { connectionString: string };
  FILES: R2Bucket;
  ENVIRONMENT: 'production' | 'development' | 'test';
  ALLOWED_ORIGINS: string;
  JWT_SECRET: string;
  TOTP_ENCRYPTION_KEY: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { db: Db };
};
