import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { JobTrackBuilder } from '@features/jobtrack/test-utils/jobtrack.builder';
import { byTestId, testIdText } from '../../test-utils/by-test-id';
import { documentDetailApi, documentSummaryApi } from '../../test-utils/document.builder';
import {
  DOCUMENTS_URL,
  JOBS_URL,
  nextMacrotask,
  respond,
  setupDocumentsTest,
  type Harness,
  type ResponseBody,
} from '../../test-utils/documents-harness';
import { CV_TEMPLATE } from '../../domain/document-templates';
import { Documents } from './documents';

const NOW = new Date('2026-10-18T12:00:00.000Z');

const DOCUMENTS = [
  documentSummaryApi({ id: 'cv-1', title: 'CV Angular', updatedAt: '2026-10-18T09:00:00.000Z' }),
  documentSummaryApi({
    id: 'cv-2',
    title: 'CV Angular — Acme',
    baseDocumentId: 'cv-1',
    jobTrackId: 'jt-1',
    updatedAt: '2026-10-17T09:00:00.000Z',
  }),
  documentSummaryApi({ id: 'lm-1', kind: 'LETTER', title: 'Lettre Acme' }),
];

const JOBS = [
  JobTrackBuilder.default().with('id', 'jt-1').with('title', 'Développeur Angular').build(),
];

describe('Documents (liste)', () => {
  let harness: Harness;

  async function render(
    documents: ResponseBody = DOCUMENTS,
    confirmAnswer = true,
  ): Promise<{ fixture: ComponentFixture<Documents>; host: HTMLElement }> {
    harness = setupDocumentsTest(Documents, confirmAnswer);
    const fixture = TestBed.createComponent(Documents);
    fixture.detectChanges();
    await respond(fixture, harness.http, [
      { url: DOCUMENTS_URL, body: documents },
      { url: JOBS_URL, body: JOBS },
    ]);
    return { fixture, host: fixture.nativeElement as HTMLElement };
  }

  const itemsOf = (host: HTMLElement, section: string): HTMLElement[] => [
    ...(byTestId(host, `documents-section-${section}`)?.querySelectorAll<HTMLElement>(
      '[data-testid="document-item"]',
    ) ?? []),
  ];

  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: NOW }));

  afterEach(() => {
    harness.http.verify();
    vi.useRealTimers();
  });

  it('Given CVs and letters When the page loads Then each sits in its section with its update date, its base and its application', async () => {
    // Given / When
    const { host } = await render();

    // Then
    const cvs = itemsOf(host, 'CV');
    expect(cvs.map((item) => testIdText(item, 'document-title'))).toEqual([
      'CV Angular',
      'CV Angular — Acme',
    ]);
    expect(testIdText(cvs[0], 'document-updated')).toBe('Modifié il y a 3 heures');
    expect(testIdText(cvs[1], 'document-base')).toBe('Déclinaison de « CV Angular »');
    expect(testIdText(cvs[1], 'document-job')).toBe('Candidature : Développeur Angular');
    expect(byTestId(cvs[0], 'document-base')).toBeNull();
    expect(itemsOf(host, 'LETTER').map((item) => testIdText(item, 'document-title'))).toEqual([
      'Lettre Acme',
    ]);
    expect(byTestId(cvs[0], 'document-title')?.getAttribute('href')).toBe('/cv-1');
  });

  it('Given no document When the page loads Then both sections say so', async () => {
    // Given / When
    const { host } = await render([]);

    // Then
    expect(testIdText(host, 'documents-empty-CV')).toContain('Aucun CV');
    expect(testIdText(host, 'documents-empty-LETTER')).toContain('Aucune lettre');
  });

  it('Given the list When « Nouveau CV » is clicked Then a CV is created from the starter template and the editor opens', async () => {
    // Given
    const { fixture, host } = await render();

    // When
    byTestId(host, 'documents-create-CV')?.click();
    const request = harness.http.expectOne({ method: 'POST', url: DOCUMENTS_URL });
    request.flush(documentDetailApi({ id: 'cv-new' }));
    await fixture.whenStable();

    // Then
    expect(request.request.body).toEqual({ kind: 'CV', title: 'Mon CV', markdown: CV_TEMPLATE });
    expect(harness.router.navigate).toHaveBeenCalledWith(['/dashboard/documents', 'cv-new']);
  });

  it('Given a CV When « Dupliquer » is clicked Then a copy is created and the list reloads', async () => {
    // Given
    const { fixture, host } = await render();

    // When
    byTestId(itemsOf(host, 'CV')[0], 'document-duplicate')?.click();
    harness.http
      .expectOne({ method: 'POST', url: `${DOCUMENTS_URL}/cv-1/duplicate` })
      .flush(
        documentDetailApi({ id: 'cv-3', title: 'CV Angular (copie)', baseDocumentId: 'cv-1' }),
      );
    await nextMacrotask();
    await respond(fixture, harness.http, [{ url: DOCUMENTS_URL, body: DOCUMENTS }]);

    // Then
    expect(harness.toaster.success).toHaveBeenCalledWith('Copie créée', 'CV Angular (copie)');
  });

  it('Given a letter When « Supprimer » is confirmed Then it is deleted and the list reloads', async () => {
    // Given
    const { fixture, host } = await render();

    // When
    byTestId(itemsOf(host, 'LETTER')[0], 'document-delete')?.click();
    await nextMacrotask();
    harness.http
      .expectOne({ method: 'DELETE', url: `${DOCUMENTS_URL}/lm-1` })
      .flush(null, { status: 204, statusText: 'No Content' });
    await nextMacrotask();
    await respond(fixture, harness.http, [{ url: DOCUMENTS_URL, body: DOCUMENTS.slice(0, 2) }]);

    // Then
    expect(harness.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'danger', title: 'Supprimer « Lettre Acme » ?' }),
    );
    expect(itemsOf(host, 'LETTER')).toEqual([]);
  });

  it('Given a letter When « Supprimer » is cancelled Then nothing is deleted', async () => {
    // Given
    const { host } = await render(DOCUMENTS, false);

    // When
    byTestId(itemsOf(host, 'LETTER')[0], 'document-delete')?.click();
    await nextMacrotask();

    // Then
    harness.http.expectNone({ method: 'DELETE' });
    expect(itemsOf(host, 'LETTER').length).toBe(1);
  });
});
