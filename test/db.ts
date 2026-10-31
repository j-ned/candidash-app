import { eq } from 'drizzle-orm';
import { openDb } from '../src/db/client';
import { users, apiTokens } from '../src/db/schema';
import { hashPassword } from '../src/auth/passwords';
import { testEnv, uniqueEmail } from './helpers';

/** Accès direct à la base de test, pour préparer ou inspecter un état. */
export async function withDb<T>(fn: (db: Awaited<ReturnType<typeof openDb>>['db']) => Promise<T>): Promise<T> {
  const { db, close } = await openDb(testEnv().HYPERDRIVE.connectionString);
  try {
    return await fn(db);
  } finally {
    await close();
  }
}

export async function createUser(options: { password?: string; storedHash?: string } = {}) {
  const email = uniqueEmail('user');
  const password = options.password ?? 'Secret-123!';
  const stored = options.storedHash ?? (await hashPassword(password));
  const [row] = await withDb((db) =>
    db.insert(users).values({ email, password: stored, role: 'USER' }).returning(),
  );
  return { ...row!, password };
}

export const storedPassword = (id: string) =>
  withDb(async (db) => (await db.query.users.findFirst({ where: eq(users.id, id) }))!.password);

export const ageApiToken = (id: string, days: number) =>
  withDb((db) =>
    db
      .update(apiTokens)
      .set({ derniereUtilisation: new Date(Date.now() - days * 24 * 60 * 60 * 1000) })
      .where(eq(apiTokens.id, id)),
  );
