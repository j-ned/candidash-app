import { describe, expect, it } from 'vitest';
import * as OTPAuth from 'otpauth';
import bcrypt from 'bcryptjs';
import { capturingMailer, client, memoryLimiter, testEnv, uniqueEmail } from './helpers';
import { ageApiToken, createUser, storedPassword } from './db';

const totpCode = (otpauthUri: string) => (OTPAuth.URI.parse(otpauthUri) as OTPAuth.TOTP).generate();

describe('inscription', () => {
  it('creates the account only once the emailed code is confirmed, and opens a session', async () => {
    const { mailer, codes } = capturingMailer();
    const api = client({ mailer });
    const email = uniqueEmail('register');

    const registered = await api.post('/auth/register', { email, password: 'Secret-123!', username: 'neo_1' });
    expect(registered.status).toBe(201);
    expect((await api.post('/auth/login', { email, password: 'Secret-123!' })).status).toBe(401);

    const verified = await api.post('/auth/verify-registration', { email, verificationCode: codes.get(email) });
    expect(verified.status).toBe(200);
    expect(await verified.json()).toMatchObject({ user: { email, username: 'neo_1', role: 'USER' } });
    expect(api.jar.has('access_token')).toBe(true);
  });

  it('refuses a wrong code and an existing email', async () => {
    const { mailer } = capturingMailer();
    const api = client({ mailer });
    const existing = await createUser();

    expect((await api.post('/auth/register', { email: existing.email, password: 'Secret-123!' })).status).toBe(409);
    const email = uniqueEmail('wrong-code');
    await api.post('/auth/register', { email, password: 'Secret-123!' });
    const res = await api.post('/auth/verify-registration', { email, verificationCode: '000000' });
    expect(res.status).toBe(400);
  });

  it('answers a validation error with the first field message', async () => {
    const res = await client().post('/auth/register', { email: uniqueEmail('weak'), password: 'court' });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      statusCode: 400,
      message: 'Le mot de passe doit contenir au moins 8 caractères',
    });
  });
});

describe('connexion et session', () => {
  it('logs in, refreshes with rotation and logs out', async () => {
    const user = await createUser();
    const api = client();

    expect((await api.post('/auth/login', { email: user.email, password: 'faux-mdp' })).status).toBe(401);
    expect((await api.post('/auth/login', { email: user.email, password: user.password })).status).toBe(200);

    const oldRefresh = api.jar.get('refresh_token')!;
    await new Promise((resolve) => setTimeout(resolve, 1100)); // iat différent → nouveau jeton
    expect((await api.post('/auth/refresh')).status).toBe(200);
    expect(api.jar.get('refresh_token')).not.toBe(oldRefresh);

    // L'ancien refresh token ne sert plus après rotation
    const replay = client();
    replay.jar.set('refresh_token', oldRefresh);
    expect((await replay.post('/auth/refresh')).status).toBe(401);

    expect((await api.post('/auth/logout')).status).toBe(200);
    expect(api.jar.has('access_token')).toBe(false);
  });

  it('upgrades a legacy bcrypt password to argon2id at login', async () => {
    const user = await createUser({ storedHash: bcrypt.hashSync('Secret-123!', 4) });

    expect((await client().post('/auth/login', { email: user.email, password: 'Secret-123!' })).status).toBe(200);
    expect(await storedPassword(user.id)).toMatch(/^\$argon2id\$/);
  });

  it('never accepts a refresh token as an access token', async () => {
    const user = await createUser();
    const api = client();
    await api.post('/auth/login', { email: user.email, password: user.password });

    const forged = client();
    forged.jar.set('access_token', api.jar.get('refresh_token')!);
    expect((await forged.post('/auth/logout')).status).toBe(401);
  });

  it('rate limits login attempts per IP and path', async () => {
    const api = client({ env: testEnv({ STRICT_LIMITER: memoryLimiter(2) }) });
    const body = { email: uniqueEmail('nobody'), password: 'Secret-123!' };

    await api.post('/auth/login', body);
    await api.post('/auth/login', body);
    expect((await api.post('/auth/login', body)).status).toBe(429);
  });
});

describe('2FA', () => {
  it('enables TOTP, then requires it at login with a working recovery code', async () => {
    const user = await createUser();
    const api = client();
    await api.post('/auth/login', { email: user.email, password: user.password });

    const setup = (await (await api.post('/auth/2fa/setup')).json()) as { qrCodeDataUri: string; otpauthUri: string };
    expect(setup.qrCodeDataUri).toMatch(/^data:image\/svg\+xml;base64,/);
    const enabled = await api.post('/auth/2fa/verify-setup', { token: totpCode(setup.otpauthUri) });
    const { recoveryCodes } = (await enabled.json()) as { recoveryCodes: string[] };
    expect(recoveryCodes).toHaveLength(8);
    expect((await api.post('/auth/2fa/setup')).status).toBe(400);

    const fresh = client();
    const pending = (await (await fresh.post('/auth/login', { email: user.email, password: user.password })).json()) as {
      requires2FA: boolean;
      tempToken: string;
    };
    expect(pending.requires2FA).toBe(true);
    expect(fresh.jar.has('access_token')).toBe(false);

    // Le jeton temporaire n'ouvre aucune route protégée
    const forged = client();
    forged.jar.set('access_token', pending.tempToken);
    expect((await forged.post('/auth/logout')).status).toBe(401);

    expect((await fresh.post('/auth/2fa/validate', { tempToken: pending.tempToken, token: '000000' })).status).toBe(401);
    const validated = await fresh.post('/auth/2fa/validate', {
      tempToken: pending.tempToken,
      token: totpCode(setup.otpauthUri),
    });
    expect(validated.status).toBe(200);

    const recovery = { tempToken: pending.tempToken, recoveryCode: recoveryCodes[0] };
    expect((await client().post('/auth/2fa/recovery', recovery)).status).toBe(200);
    expect((await client().post('/auth/2fa/recovery', recovery)).status).toBe(401);

    expect((await api.post('/auth/2fa/disable', { password: 'faux' })).status).toBe(401);
    expect((await api.post('/auth/2fa/disable', { password: user.password })).status).toBe(200);
  });
});

describe("jetons d'API (extension)", () => {
  it('logs the extension in, lists, expires after 90 idle days and revokes', async () => {
    const user = await createUser();
    const extension = client();

    const login = await extension.post('/api-tokens/login', { email: user.email, password: user.password });
    const created = (await login.json()) as { id: string; token: string; user: { email: string } };
    expect(created.token).toMatch(/^ctok_[0-9a-f]{64}$/);
    expect(created.user.email).toBe(user.email);

    const web = client();
    await web.post('/auth/login', { email: user.email, password: user.password });
    const listed = (await (await web.get('/api-tokens')).json()) as { id: string }[];
    expect(listed.map((t) => t.id)).toContain(created.id);
    expect(JSON.stringify(listed)).not.toContain('ctok_');

    const bearer = { Authorization: `Bearer ${created.token}` };
    await ageApiToken(created.id, 91);
    expect((await extension.delete('/api-tokens/me', bearer)).status).toBe(401);
    await ageApiToken(created.id, 0);
    expect((await extension.delete('/api-tokens/me', bearer)).status).toBe(200);
    expect((await extension.delete('/api-tokens/me', bearer)).status).toBe(401);
  });

  it("refuses to revoke another user's token", async () => {
    const owner = await createUser();
    const other = await createUser();
    const created = (await (
      await client().post('/api-tokens/login', { email: owner.email, password: owner.password })
    ).json()) as { id: string };

    const api = client();
    await api.post('/auth/login', { email: other.email, password: other.password });
    expect((await api.delete(`/api-tokens/${created.id}`)).status).toBe(403);
  });
});
