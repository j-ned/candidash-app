import { describe, expect, it } from 'vitest';
import { client, memoryBucket, testEnv } from './helpers';
import { createUser, withDb } from './db';
import { extensionToken, loggedIn } from './session';
import { jobTracks } from '../src/db/schema';
import { eq } from 'drizzle-orm';

type Job = {
  id: string;
  status: string;
  offerText?: string;
  reminder: { frequency: number; isActive: boolean; nextReminderAt: string } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const json = async (res: Response) => (await res.json()) as Job;

describe('candidatures', () => {
  it('creates with a reminder, lists, filters, reads and deletes', async () => {
    const { bucket, deleted } = memoryBucket();
    const { web } = await loggedIn({ env: testEnv({ FILES: bucket }) });

    const created = await web.post('/jobtrack/with-reminder', {
      title: 'Dev Angular',
      company: 'ACME',
      status: 'APPLIED',
      frequency: 5,
      nextReminderAt: new Date(Date.now() + 5 * DAY_MS).toISOString(),
      offerText: 'Texte de l’offre',
    });
    expect(created.status).toBe(201);
    const job = await json(created);
    expect(job.reminder).toMatchObject({ frequency: 5, isActive: true });

    const list = (await (await web.get('/jobtrack')).json()) as Job[];
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty('offerText');
    expect((await (await web.get('/jobtrack/status/APPLIED')).json()) as Job[]).toHaveLength(1);
    expect((await (await web.get('/jobtrack/status/REJECTED')).json()) as Job[]).toHaveLength(0);
    expect((await json(await web.get(`/jobtrack/${job.id}`))).offerText).toBe('Texte de l’offre');

    expect((await web.delete(`/jobtrack/${job.id}`)).status).toBe(200);
    expect(deleted).toEqual([]);
    expect((await web.get(`/jobtrack/${job.id}`)).status).toBe(404);
  });

  it("hides another user's application (404, not 403)", async () => {
    const { web } = await loggedIn();
    const job = await json(
      await web.post('/jobtrack/with-reminder', { title: 'Privé', frequency: 7, nextReminderAt: new Date().toISOString() }),
    );
    const { web: intruder } = await loggedIn();

    expect((await intruder.get(`/jobtrack/${job.id}`)).status).toBe(404);
    expect((await intruder.put(`/jobtrack/${job.id}/with-reminder`, { title: 'Pris' })).status).toBe(404);
    expect((await intruder.delete(`/jobtrack/${job.id}`)).status).toBe(404);
  });

  it('clears the offer text when it is emptied, and caps it at 20 000 characters', async () => {
    const { web } = await loggedIn();
    const job = await json(
      await web.post('/jobtrack/with-reminder', {
        title: 'Dev',
        offerText: 'Avant',
        frequency: 7,
        nextReminderAt: new Date().toISOString(),
      }),
    );

    expect((await json(await web.put(`/jobtrack/${job.id}/with-reminder`, { offerText: '  ' }))).offerText).toBeUndefined();
    expect((await web.put(`/jobtrack/${job.id}/with-reminder`, { offerText: 'x'.repeat(20_001) })).status).toBe(400);
  });

  it('creates the application on upsert when the id is unknown', async () => {
    const { web } = await loggedIn();
    const id = crypto.randomUUID();

    expect((await web.put(`/jobtrack/${id}/with-reminder`, { title: 'Absente' })).status).toBe(404);
    const res = await web.put(`/jobtrack/${id}/with-reminder?upsert=true`, { title: 'Créée' });
    expect(await json(res)).toMatchObject({ id, status: 'APPLIED' });
  });
});

describe('relances', () => {
  async function toApply() {
    const { web } = await loggedIn();
    const job = await json(
      await web.post('/jobtrack/with-reminder', {
        title: 'Dev',
        status: 'TO_APPLY',
        frequency: 3,
        nextReminderAt: new Date().toISOString(),
        isActive: false,
      }),
    );
    return { web, job };
  }

  it('schedules a follow-up at its frequency when the application is sent', async () => {
    const { web, job } = await toApply();
    const before = Date.now();

    const sent = await json(await web.put(`/jobtrack/${job.id}/with-reminder`, { status: 'APPLIED' }));
    expect(sent.reminder).toMatchObject({ isActive: true, frequency: 3 });
    expect(Date.parse(sent.reminder!.nextReminderAt)).toBeGreaterThanOrEqual(before + 3 * DAY_MS - 1000);
  });

  it('turns the reminder off on a terminal status, and keeps an explicit choice', async () => {
    const { web, job } = await toApply();
    await web.put(`/jobtrack/${job.id}/with-reminder`, { status: 'APPLIED' });

    const rejected = await json(await web.put(`/jobtrack/${job.id}/with-reminder`, { status: 'REJECTED' }));
    expect(rejected.reminder?.isActive).toBe(false);

    const explicit = await json(
      await web.put(`/jobtrack/${job.id}/with-reminder`, { status: 'APPLIED', isActive: false }),
    );
    expect(explicit.reminder?.isActive).toBe(false);
  });
});

describe('extension', () => {
  it('quick-adds with a 7-day follow-up when sent, and finds the offer again by URL', async () => {
    const user = await createUser();
    const bearer = await extensionToken(user.email, user.password);
    const ext = client();

    expect((await ext.post('/jobtrack/quick-add', { title: 'Sans jeton' })).status).toBe(401);
    expect((await ext.post('/jobtrack/quick-add', { title: 'X', status: 'REJECTED' }, bearer)).status).toBe(400);

    const spotted = await json(await ext.post('/jobtrack/quick-add', { title: 'Repérée' }, bearer));
    expect(spotted).toMatchObject({ status: 'TO_APPLY', reminder: null });

    const sent = await json(
      await ext.post(
        '/jobtrack/quick-add',
        {
          title: 'Envoyée',
          status: 'APPLIED',
          jobUrl: 'https://www.indeed.com/viewjob?jk=abc&utm_source=x',
          offerText: 'Long texte',
        },
        bearer,
      ),
    );
    expect(sent.reminder).toMatchObject({ frequency: 7, isActive: true });

    const found = (await (
      await ext.get(`/jobtrack/lookup?url=${encodeURIComponent('https://indeed.com/viewjob?jk=abc')}`, bearer)
    ).json()) as { jobTrack: Job | null };
    expect(found.jobTrack?.id).toBe(sent.id);
    expect(found.jobTrack).not.toHaveProperty('offerText');

    const none = (await (await ext.get('/jobtrack/lookup?url=https%3A%2F%2Fexample.com%2Fautre', bearer)).json()) as {
      jobTrack: null;
    };
    expect(none.jobTrack).toBeNull();
    await withDb((db) => db.delete(jobTracks).where(eq(jobTracks.userId, user.id)));
  });
});
