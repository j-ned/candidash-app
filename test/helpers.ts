import { createApp } from '../src/app';
import type { Bindings } from '../src/env';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://candidash:candidash@localhost:5432/candidash';

export function testEnv(overrides: Partial<Bindings> = {}): Bindings {
  return {
    HYPERDRIVE: { connectionString: DATABASE_URL },
    FILES: {} as R2Bucket,
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'http://localhost:4200',
    JWT_SECRET: 'test-jwt-secret',
    TOTP_ENCRYPTION_KEY: '0'.repeat(64),
    ...overrides,
  };
}

// waitUntil attendu immédiatement : les tests voient l'état final (connexion fermée…)
function executionContext(): ExecutionContext {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil: (promise: Promise<unknown>) => void pending.push(promise),
    passThroughOnException: () => {},
    props: {},
  } as unknown as ExecutionContext;
}

export function request(path: string, init?: RequestInit, env: Bindings = testEnv()) {
  return createApp().request(`/api/v1${path}`, init, env, executionContext());
}
