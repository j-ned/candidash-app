import { describe, expect, it } from 'vitest';
import { capturingMailer, client, memoryBucket, testEnv } from './helpers.js';
import { eq } from 'drizzle-orm';
import { jobTracks } from '../src/db/schema.js';
import { createUser, storedPassword, withDb } from './db.js';
import { loggedIn, extensionToken } from './session.js';

describe('profil', () => {
  it("reads and updates one's own profile, never someone else's", async () => {
    const { user, web } = await loggedIn();
    const other = await createUser();

    expect((await web.get(`/accounts/profile/${user.id}`)).status).toBe(200);
    expect((await web.get(`/accounts/profile/${other.id}`)).status).toBe(403);

    const updated = await web.put(`/accounts/profile-update/${user.id}`, { username: 'neo' });
    expect(await updated.json()).toMatchObject({ id: user.id, username: 'neo' });
    expect((await web.put(`/accounts/profile-update/${user.id}`, { role: 'ADMIN' })).status).toBe(400);
  });

  it('changes the email only with the current password, and refuses a taken one', async () => {
    const { user, web } = await loggedIn();
    const other = await createUser();
    const fresh = `new-${user.email}`;

    expect((await web.put(`/accounts/profile-update/${user.id}`, { email: fresh })).status).toBe(401);
    expect(
      (await web.put(`/accounts/profile-update/${user.id}`, { email: other.email, currentPassword: user.password }))
        .status,
    ).toBe(409);
    const res = await web.put(`/accounts/profile-update/${user.id}`, { email: fresh, currentPassword: user.password });
    expect(await res.json()).toMatchObject({ email: fresh });
  });

  it('deletes the account with its stored PDFs', async () => {
    const { bucket, deleted } = memoryBucket();
    const { user, web } = await loggedIn({ env: testEnv({ FILES: bucket }) });
    const job = (await (
      await web.post('/jobtrack/with-reminder', {
        title: 'Dev',
        frequency: 7,
        nextReminderAt: new Date().toISOString(),
      })
    ).json()) as { id: string };
    await withDb((db) => db.update(jobTracks).set({ cvFileName: 'cv.pdf' }).where(eq(jobTracks.id, job.id)));

    expect((await web.delete(`/accounts/deactivation/${user.id}`)).status).toBe(200);
    expect(deleted).toEqual([`${user.id}/${job.id}/cv.pdf`]);
    expect((await client().post('/auth/login', { email: user.email, password: user.password })).status).toBe(401);
  });
});

describe('mot de passe', () => {
  it('resets through the emailed link once, and closes every open session', async () => {
    const { mailer, resetUrls } = capturingMailer();
    const { user, web } = await loggedIn({ mailer });
    const token = await extensionToken(user.email, user.password);

    const unknown = await web.post('/accounts/forgot-password', { email: `nobody-${user.email}` });
    const known = await web.post('/accounts/forgot-password', { email: user.email });
    expect(await unknown.json()).toEqual(await known.json());

    const resetToken = new URL(resetUrls.get(user.email)!).searchParams.get('token')!;
    expect(resetUrls.get(user.email)).toMatch(/^http:\/\/localhost:4200\/auth\/reset-password\?token=/);
    const body = { token: resetToken, newPassword: 'Nouveau-456!' };
    expect((await web.post('/accounts/reset-password', body)).status).toBe(200);
    expect((await web.post('/accounts/reset-password', body)).status).toBe(400);

    expect((await web.post('/auth/refresh')).status).toBe(401);
    expect((await client().delete('/api-tokens/me', token)).status).toBe(401);
    expect((await client().post('/auth/login', { email: user.email, password: 'Nouveau-456!' })).status).toBe(200);
  });

  it('changes the password with the current one and notifies by email', async () => {
    const { mailer, changed } = capturingMailer();
    const { user, web } = await loggedIn({ mailer });

    const wrong = await web.put('/accounts/change-password', { currentPassword: 'faux', newPassword: 'Nouveau-456!' });
    expect(wrong.status).toBe(401);
    const ok = await web.put('/accounts/change-password', { currentPassword: user.password, newPassword: 'Nouveau-456!' });
    expect(ok.status).toBe(200);
    expect(changed()).toEqual([user.email]);
    expect(await storedPassword(user.id)).toMatch(/^\$argon2id\$/);
  });
});
