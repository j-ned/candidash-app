import { describe, expect, it } from 'vitest';
import { memoryBucket, testEnv } from './helpers.js';
import { loggedIn } from './session.js';

const pdf = (content = '%PDF-1.7\n…', type = 'application/pdf', name = 'Mon CV.pdf') => {
  const form = new FormData();
  form.set('file', new File([content], name, { type }));
  return form;
};

async function setup() {
  const storage = memoryBucket();
  const session = await loggedIn({ env: testEnv({ FILES: storage.bucket }) });
  const job = (await (
    await session.web.post('/jobtrack/with-reminder', { title: 'Dev', frequency: 7, nextReminderAt: new Date().toISOString() })
  ).json()) as { id: string };
  return { ...storage, ...session, job };
}

describe('CV et lettre de la candidature (R2)', () => {
  it('uploads a PDF, downloads it with its name, then deletes it', async () => {
    const { web, job, user, objects } = await setup();

    const up = await web.post(`/jobtrack/${job.id}/cv`, pdf());
    expect(up.status).toBe(201);
    expect(await up.json()).toEqual({ fileName: 'Mon CV.pdf' });
    expect(objects.has(`${user.id}/${job.id}/cv.pdf`)).toBe(true);

    const down = await web.get(`/jobtrack/${job.id}/cv`);
    expect(down.headers.get('content-disposition')).toBe('attachment; filename="Mon%20CV.pdf"');
    expect(await down.text()).toBe('%PDF-1.7\n…');

    expect(await (await web.delete(`/jobtrack/${job.id}/cv`)).json()).toEqual({ message: 'CV supprimé' });
    expect((await web.get(`/jobtrack/${job.id}/cv`)).status).toBe(404);
    expect(objects.size).toBe(0);
  });

  it('refuses a file that only claims to be a PDF, and a file over 5 MB', async () => {
    const { web, job } = await setup();

    expect((await web.post(`/jobtrack/${job.id}/lm`, pdf('<html>pas un pdf'))).status).toBe(400);
    expect((await web.post(`/jobtrack/${job.id}/lm`, pdf('%PDF-1.7', 'text/plain'))).status).toBe(400);
    expect((await web.post(`/jobtrack/${job.id}/lm`, pdf('%PDF-' + 'x'.repeat(6 * 1024 * 1024)))).status).toBe(413);
  });

  it("never touches another user's application", async () => {
    const { job } = await setup();
    const { web: intruder } = await loggedIn();

    expect((await intruder.post(`/jobtrack/${job.id}/cv`, pdf())).status).toBe(404);
    expect((await intruder.get(`/jobtrack/${job.id}/cv`)).status).toBe(404);
  });
});

describe('documents Markdown', () => {
  it('creates, edits, duplicates for an application, lists without content and deletes', async () => {
    const { web, job } = await setup();

    const created = await web.post('/documents', { kind: 'CV', title: '  CV Dev  ', markdown: '# Moi' });
    expect(created.status).toBe(201);
    const doc = (await created.json()) as { id: string; title: string };
    expect(doc.title).toBe('CV Dev');
    expect(doc).not.toHaveProperty('userId');

    await web.put(`/documents/${doc.id}`, { markdown: '# Moi\n\nAngular' });
    const copy = (await (await web.post(`/documents/${doc.id}/duplicate`, { jobTrackId: job.id })).json()) as {
      title: string;
      baseDocumentId: string;
      markdown: string;
    };
    expect(copy).toMatchObject({ title: 'CV Dev (copie)', baseDocumentId: doc.id, markdown: '# Moi\n\nAngular' });

    const list = (await (await web.get('/documents')).json()) as object[];
    expect(list).toHaveLength(2);
    expect(list[0]).not.toHaveProperty('markdown');

    expect((await web.delete(`/documents/${doc.id}`)).status).toBe(204);
    expect((await web.get(`/documents/${doc.id}`)).status).toBe(404);
  });

  it("refuses to attach a document to someone else's application", async () => {
    const { job } = await setup();
    const { web: intruder } = await loggedIn();

    const res = await intruder.post('/documents', { kind: 'LETTER', title: 'Lettre', jobTrackId: job.id });
    expect(res.status).toBe(404);
  });
});
