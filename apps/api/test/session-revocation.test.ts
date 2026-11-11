import { describe, expect, it } from 'vitest';
import { sign } from 'hono/jwt';
import { capturingMailer, client, testEnv, type Client } from './helpers.js';
import { createUser } from './db.js';
import { extensionToken, loggedIn } from './session.js';

/** Navigateur d'un attaquant : il n'a que le cookie `access_token` copié chez la victime. */
function withStolenAccessToken(victim: Client): Client {
  const token = victim.jar.get('access_token');
  if (!token) throw new Error("La session de la victime n'a pas de cookie access_token");
  const thief = client();
  thief.jar.set('access_token', token);
  return thief;
}

const PROTECTED_ROUTE = '/jobtrack';

describe("révocation du jeton d'accès", () => {
  it("refuse un jeton d'accès encore présenté après la déconnexion", async () => {
    const { web } = await loggedIn();
    const thief = withStolenAccessToken(web);
    expect((await thief.get(PROTECTED_ROUTE)).status).toBe(200);

    expect((await web.post('/auth/logout')).status).toBe(200);

    expect((await thief.get(PROTECTED_ROUTE)).status).toBe(401);
  });

  it("refuse un jeton d'accès encore présenté après un changement de mot de passe", async () => {
    const { mailer } = capturingMailer();
    const { user, web } = await loggedIn({ mailer });
    const thief = withStolenAccessToken(web);

    const changed = await web.put('/accounts/change-password', {
      currentPassword: user.password,
      newPassword: 'Nouveau-456!',
    });
    expect(changed.status).toBe(200);

    expect((await thief.get(PROTECTED_ROUTE)).status).toBe(401);
  });

  it("refuse un jeton d'accès encore présenté après une réinitialisation du mot de passe", async () => {
    const { mailer, resetUrls } = capturingMailer();
    const { user, web } = await loggedIn({ mailer });
    const thief = withStolenAccessToken(web);

    await client({ mailer }).post('/accounts/forgot-password', { email: user.email });
    const resetUrl = resetUrls.get(user.email);
    if (!resetUrl) throw new Error("Aucun lien de réinitialisation n'a été envoyé");
    const reset = await client().post('/accounts/reset-password', {
      token: new URL(resetUrl).searchParams.get('token'),
      newPassword: 'Nouveau-456!',
    });
    expect(reset.status).toBe(200);

    expect((await thief.get(PROTECTED_ROUTE)).status).toBe(401);
  });

  it("refuse un jeton d'accès encore présenté après la suppression du compte", async () => {
    const { user, web } = await loggedIn();
    const thief = withStolenAccessToken(web);

    expect((await web.delete(`/accounts/deactivation/${user.id}`)).status).toBe(200);

    expect((await thief.get(PROTECTED_ROUTE)).status).toBe(401);
  });

  it("refuse un jeton d'accès émis avant le versionnage des sessions (sans version)", async () => {
    const user = await createUser();
    const nowS = Math.floor(Date.now() / 1000);
    const legacyToken = await sign(
      { sub: user.id, email: user.email, role: user.role, iat: nowS, exp: nowS + 3600 },
      testEnv().JWT_SECRET,
      'HS256',
    );
    const legacy = client();
    legacy.jar.set('access_token', legacyToken);

    expect((await legacy.get(PROTECTED_ROUTE)).status).toBe(401);
  });

  it('garde une session normale utilisable, y compris après un renouvellement', async () => {
    const { web } = await loggedIn();
    expect((await web.get(PROTECTED_ROUTE)).status).toBe(200);

    expect((await web.post('/auth/refresh')).status).toBe(200);

    expect((await web.get(PROTECTED_ROUTE)).status).toBe(200);
  });

  it('rouvre une session utilisable à la reconnexion qui suit une déconnexion', async () => {
    const { user, web } = await loggedIn();
    await web.post('/auth/logout');

    expect((await web.post('/auth/login', { email: user.email, password: user.password })).status).toBe(200);

    expect((await web.get(PROTECTED_ROUTE)).status).toBe(200);
  });

  it("laisse le jeton de l'extension valide après une déconnexion web", async () => {
    const { user, web } = await loggedIn();
    const bearer = await extensionToken(user.email, user.password);

    await web.post('/auth/logout');

    const lookup = await client().get('/jobtrack/lookup?url=https%3A%2F%2Fexample.com%2Foffre', bearer);
    expect(lookup.status).toBe(200);
  });
});
