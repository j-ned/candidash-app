import { createApp } from '../src/app';
import type { Bindings } from '../src/env';
import { templatedMailer, type Mailer, type OutgoingEmail } from '../src/mail/mailer';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://candidash:candidash@localhost:5432/candidash';

/** Limiteur en mémoire, même contrat que le binding Rate Limiting de Cloudflare. */
export function memoryLimiter(limit: number) {
  const counts = new Map<string, number>();
  return {
    async limit({ key }: { key: string }) {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { success: count <= limit };
    },
  };
}

export function testEnv(overrides: Partial<Bindings> = {}): Bindings {
  return {
    HYPERDRIVE: { connectionString: DATABASE_URL },
    FILES: {} as R2Bucket,
    STRICT_LIMITER: memoryLimiter(1000),
    GLOBAL_LIMITER: memoryLimiter(1000),
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'http://localhost:4200',
    JWT_SECRET: 'test-jwt-secret',
    TOTP_ENCRYPTION_KEY: '0'.repeat(64),
    ...overrides,
  };
}

/** Faux mailer : les vrais gabarits, sans envoi ; garde chaque email par destinataire. */
export function capturingMailer() {
  const sent: OutgoingEmail[] = [];
  const mailer = templatedMailer(async (email) => {
    sent.push(email);
    return true;
  });
  const last = (to: string) => sent.findLast((email) => email.to === to);
  return {
    mailer,
    sent,
    codes: { get: (to: string) => last(to)?.text.match(/Code : (\d{6})/)?.[1] },
    resetUrls: { get: (to: string) => last(to)?.text.match(/https?:\/\/\S+reset-password\?token=\w+/)?.[0] },
    changed: () => sent.filter((email) => email.subject === 'Votre mot de passe a été modifié').map((email) => email.to),
  };
}

/** Faux bucket R2 en mémoire : dépôt, lecture et suppression, comme le binding. */
export function memoryBucket() {
  const objects = new Map<string, Uint8Array>();
  const deleted: string[] = [];
  const bucket = {
    async put(key: string, value: ArrayBuffer) {
      objects.set(key, new Uint8Array(value));
    },
    async get(key: string) {
      const bytes = objects.get(key);
      return bytes ? { body: new Response(bytes).body } : null;
    },
    async delete(keys: string | string[]) {
      for (const key of [keys].flat()) {
        objects.delete(key);
        deleted.push(key);
      }
    },
  } as unknown as R2Bucket;
  return { bucket, objects, deleted };
}

// waitUntil sans attente : la connexion se ferme en arrière-plan, comme sous Workers
function executionContext(): ExecutionContext {
  return {
    waitUntil: () => {},
    passThroughOnException: () => {},
    props: {},
  } as unknown as ExecutionContext;
}

export type Client = ReturnType<typeof client>;

/**
 * Client de test avec cookies : chaque Set-Cookie est rejoué sur les requêtes suivantes,
 * comme le ferait le navigateur.
 */
export function client(options: { env?: Bindings; mailer?: Mailer } = {}) {
  const env = options.env ?? testEnv();
  const app = createApp(options.mailer ? { mailer: () => options.mailer! } : {});
  const jar = new Map<string, string>();

  async function send(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const isForm = body instanceof FormData;
    const res = await app.request(
      `/api/v1${path}`,
      {
        method,
        headers: {
          ...(body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
          ...(cookie && { Cookie: cookie }),
          ...headers,
        },
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      },
      env,
      executionContext(),
    );
    for (const header of res.headers.getSetCookie()) {
      const [pair, ...attrs] = header.split(';');
      const [name, value] = pair!.split('=') as [string, string];
      if (attrs.some((a) => /max-age=0/i.test(a))) jar.delete(name);
      else jar.set(name, value);
    }
    return res;
  }

  return {
    env,
    jar,
    get: (path: string, headers?: Record<string, string>) => send('GET', path, undefined, headers),
    post: (path: string, body?: unknown, headers?: Record<string, string>) => send('POST', path, body ?? {}, headers),
    put: (path: string, body?: unknown) => send('PUT', path, body ?? {}),
    delete: (path: string, headers?: Record<string, string>) => send('DELETE', path, undefined, headers),
  };
}

/** Requête ponctuelle sans état (tests simples). */
export function request(path: string, init?: RequestInit, env: Bindings = testEnv()) {
  return createApp().request(`/api/v1${path}`, init, env, executionContext());
}

export function uniqueEmail(label: string): string {
  return `${label}-${crypto.randomUUID()}@example.com`;
}
