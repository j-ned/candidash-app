import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { readBindings } from '../src/node-env.js';
import { runMigrations } from '../src/db/migrate.js';
import type { Bindings } from '../src/env.js';
import { dbLimiter } from '../src/rate-limit.js';
import { client, testEnv, uniqueEmail } from './helpers.js';
import { withDb } from './db.js';

const base = {
  DATABASE_URL: testEnv().DATABASE_URL,
  ALLOWED_ORIGINS: 'https://candidash.example.test',
  JWT_SECRET: 'jwt-de-test',
  TOTP_ENCRYPTION_KEY: '0'.repeat(64),
};
const s3 = {
  S3_ENDPOINT: 'https://compte.r2.cloudflarestorage.com',
  S3_ACCESS_KEY: 'cle',
  S3_SECRET_KEY: 'secret',
  S3_BUCKET: 'candidash-app',
};
const smtp = { MAIL_HOST: 'smtp.example.test', MAIL_USER: 'robot@example.test', MAIL_PASSWORD: 'mdp' };

describe("environnement hors Vercel (image Docker, APP_ENV)", () => {
  it('runs as production when the image declares APP_ENV=production', () => {
    expect(readBindings({ ...base, ...s3, ...smtp, APP_ENV: 'production' }).ENVIRONMENT).toBe('production');
  });

  it('refuses to start the production image without SMTP nor S3', () => {
    expect(() => readBindings({ ...base, ...s3, APP_ENV: 'production' })).toThrow('MAIL_HOST');
    expect(() => readBindings({ ...base, ...smtp, APP_ENV: 'production' })).toThrow('S3_ENDPOINT');
  });

  it('keeps a Vercel preview a preview, whatever APP_ENV says', () => {
    expect(readBindings({ ...base, VERCEL_ENV: 'preview', APP_ENV: 'production' }).ENVIRONMENT).toBe('preview');
  });

  it('stays in development without any environment variable', () => {
    expect(readBindings({ ...base }).ENVIRONMENT).toBe('development');
  });
});

describe('migrations au démarrage du conteneur', () => {
  const database = `migrations_${crypto.randomUUID().replaceAll('-', '')}`;
  const url = new URL(base.DATABASE_URL);
  url.pathname = `/${database}`;
  const folder = fileURLToPath(new URL('../drizzle', import.meta.url));
  const migrationCount = (
    JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8')) as {
      entries: unknown[];
    }
  ).entries.length;

  async function admin<T>(run: (client: Client) => Promise<T>, connectionString = base.DATABASE_URL): Promise<T> {
    const client = new Client({ connectionString });
    await client.connect();
    try {
      return await run(client);
    } finally {
      await client.end();
    }
  }

  const applied = () =>
    admin(
      async (client) =>
        (await client.query<{ count: string }>('select count(*) from drizzle.__drizzle_migrations')).rows[0]?.count,
      url.toString(),
    );

  beforeAll(() => admin((client) => client.query(`CREATE DATABASE "${database}"`)));
  afterAll(() => admin((client) => client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)));

  it('brings an empty database to the current schema', async () => {
    await runMigrations(url.toString(), folder);

    expect(await applied()).toBe(String(migrationCount));
    const columns = await admin(
      (client) =>
        client.query(
          `select 1 from information_schema.columns where table_name = 'Utilisateurs' and column_name = 'tokenVersion'`,
        ),
      url.toString(),
    );
    expect(columns.rowCount).toBe(1);
  });

  it('applies nothing on a database already up to date', async () => {
    await runMigrations(url.toString(), folder);
    await runMigrations(url.toString(), folder);

    expect(await applied()).toBe(String(migrationCount));
  });

  it('fails loudly when the database is unreachable', async () => {
    const unreachable = new URL(url);
    unreachable.port = '1';

    await expect(runMigrations(unreachable.toString(), folder)).rejects.toThrow();
  });
});

describe('adresse du visiteur derrière un proxy (CLIENT_IP_HEADER)', () => {
  const login = { email: uniqueEmail('nobody'), password: 'Secret-123!' };

  async function loginStatuses(env: Partial<Bindings>, headers: (attempt: number) => Record<string, string>) {
    const strict = await withDb(async (db) => dbLimiter(db, 2));
    const api = client({ env: testEnv({ STRICT_LIMITER: strict, ...env }) });
    const statuses = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      statuses.push((await api.post('/auth/login', login, headers(attempt))).status);
    }
    return statuses;
  }

  it('counts each visitor apart behind Cloudflare, where the proxy address is shared', async () => {
    const proxy = `proxy-${crypto.randomUUID()}`;

    const statuses = await loginStatuses({ CLIENT_IP_HEADER: 'cf-connecting-ip' }, (attempt) => ({
      'X-Real-IP': proxy,
      'CF-Connecting-IP': `visiteur-${attempt}-${crypto.randomUUID()}`,
    }));

    expect(statuses).toEqual([401, 401, 401]);
  });

  it('limits a visitor by the configured header, whatever X-Real-IP says', async () => {
    const visitor = `visiteur-${crypto.randomUUID()}`;

    const statuses = await loginStatuses({ CLIENT_IP_HEADER: 'cf-connecting-ip' }, (attempt) => ({
      'X-Real-IP': `proxy-${attempt}-${crypto.randomUUID()}`,
      'CF-Connecting-IP': visitor,
    }));

    expect(statuses).toEqual([401, 401, 429]);
  });

  it('ignores a CF-Connecting-IP sent by the client when the header is not configured', async () => {
    const real = `reelle-${crypto.randomUUID()}`;

    const statuses = await loginStatuses({}, (attempt) => ({
      'X-Real-IP': real,
      'CF-Connecting-IP': `usurpee-${attempt}-${crypto.randomUUID()}`,
    }));

    expect(statuses).toEqual([401, 401, 429]);
  });

  it('reads the header name from the environment', () => {
    expect(readBindings({ ...base, CLIENT_IP_HEADER: 'cf-connecting-ip' }).CLIENT_IP_HEADER).toBe('cf-connecting-ip');
    expect(readBindings({ ...base }).CLIENT_IP_HEADER).toBeUndefined();
  });
});
