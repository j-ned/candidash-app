import { client, type Client } from './helpers';
import { createUser } from './db';

type Options = Parameters<typeof client>[0];

/** Utilisateur connecté (cookies de session) et, au besoin, son jeton d'extension. */
export async function loggedIn(options: Options = {}) {
  const user = await createUser();
  const web: Client = client(options);
  await web.post('/auth/login', { email: user.email, password: user.password });
  return { user, web };
}

export async function extensionToken(email: string, password: string, options: Options = {}) {
  const res = await client(options).post('/api-tokens/login', { email, password });
  const { token } = (await res.json()) as { token: string };
  return { Authorization: `Bearer ${token}` };
}
