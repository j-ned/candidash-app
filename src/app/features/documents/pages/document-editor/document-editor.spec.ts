import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { JobTrackBuilder } from '@features/jobtrack/test-utils/jobtrack.builder';
import { byTestId, testIdText } from '../../test-utils/by-test-id';
import { documentDetailApi } from '../../test-utils/document.builder';
import {
  DOCUMENTS_URL,
  JOBS_URL,
  respond,
  setupDocumentsTest,
  type Harness,
  type ResponseBody,
} from '../../test-utils/documents-harness';
import { DocumentEditor } from './document-editor';

const DOCUMENT = documentDetailApi({
  id: 'cv-1',
  title: 'CV Angular',
  markdown: '# Camille Martin\n\n## Expérience',
  jobTrackId: null,
});

const JOBS = [
  JobTrackBuilder.default().with('id', 'jt-1').with('title', 'Développeur Angular').build(),
  JobTrackBuilder.default().with('id', 'jt-2').with('title', 'Lead front').build(),
];

describe('DocumentEditor', () => {
  let harness: Harness;

  type Rendered = {
    readonly fixture: ComponentFixture<DocumentEditor>;
    readonly host: HTMLElement;
    readonly editor: DocumentEditor;
  };

  async function render(
    document: ResponseBody = DOCUMENT,
    confirmAnswer = true,
  ): Promise<Rendered> {
    harness = setupDocumentsTest(DocumentEditor, confirmAnswer);
    const fixture = TestBed.createComponent(DocumentEditor);
    fixture.componentRef.setInput('id', 'cv-1');
    fixture.detectChanges();
    await respond(fixture, harness.http, [
      { url: `${DOCUMENTS_URL}/cv-1`, body: document },
      { url: JOBS_URL, body: JOBS },
    ]);
    return {
      fixture,
      host: fixture.nativeElement as HTMLElement,
      editor: fixture.componentInstance,
    };
  }

  function type(rendered: Rendered, testId: string, value: string): void {
    const field = byTestId(rendered.host, testId) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    rendered.fixture.detectChanges();
  }

  function choose(rendered: Rendered, testId: string, value: string): void {
    const select = byTestId(rendered.host, testId) as HTMLSelectElement;
    select.value = value;
    // Un navigateur émet les deux à la sélection d'une option.
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    rendered.fixture.detectChanges();
  }

  async function save(rendered: Rendered): Promise<void> {
    byTestId(rendered.host, 'document-form')?.dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await rendered.fixture.whenStable();
    rendered.fixture.detectChanges();
  }

  const preview = (rendered: Rendered): HTMLElement =>
    byTestId(rendered.host, 'document-preview') ?? rendered.host;

  afterEach(() => harness.http.verify());

  it('Given a saved CV When the editor opens Then its title, its Markdown and its preview are shown, with nothing to save', async () => {
    // Given / When
    const rendered = await render();

    // Then
    expect((byTestId(rendered.host, 'document-title') as HTMLInputElement).value).toBe(
      'CV Angular',
    );
    expect((byTestId(rendered.host, 'document-markdown') as HTMLTextAreaElement).value).toBe(
      '# Camille Martin\n\n## Expérience',
    );
    expect(preview(rendered).querySelector('h2')?.textContent).toBe('Camille Martin');
    expect(testIdText(rendered.host, 'document-save-state')).toBe('Tout est enregistré');
    expect(rendered.editor.canLeave()).toBe(true);
  });

  it('Given the editor When the Markdown is edited Then the preview follows and the changes are flagged as unsaved', async () => {
    // Given
    const rendered = await render();

    // When
    type(rendered, 'document-markdown', '# Camille Martin\n\n## Formation');

    // Then
    expect(preview(rendered).querySelector('h3')?.textContent).toBe('Formation');
    expect(testIdText(rendered.host, 'document-save-state')).toBe('Modifications non enregistrées');
  });

  it('Given edits When saved Then the title, the Markdown and the application are sent by PUT, then flagged as saved', async () => {
    // Given
    const rendered = await render();
    type(rendered, 'document-title', 'CV Angular — Acme');
    type(rendered, 'document-markdown', '# Camille');
    choose(rendered, 'document-job', 'jt-2');

    // When
    await save(rendered);
    const request = harness.http.expectOne({ method: 'PUT', url: `${DOCUMENTS_URL}/cv-1` });
    request.flush(documentDetailApi({ id: 'cv-1', title: 'CV Angular — Acme' }));
    await rendered.fixture.whenStable();
    rendered.fixture.detectChanges();

    // Then
    expect(request.request.body).toEqual({
      title: 'CV Angular — Acme',
      markdown: '# Camille',
      jobTrackId: 'jt-2',
    });
    expect(testIdText(rendered.host, 'document-save-state')).toBe('Tout est enregistré');
    expect(harness.toaster.success).toHaveBeenCalledWith('Document enregistré');
    expect(rendered.editor.canLeave()).toBe(true);
  });

  it('Given a document linked to an application When the link is removed and saved Then null is sent', async () => {
    // Given
    const rendered = await render({ ...DOCUMENT, jobTrackId: 'jt-1' });
    expect((byTestId(rendered.host, 'document-job') as HTMLSelectElement).value).toBe('jt-1');
    choose(rendered, 'document-job', '');

    // When
    await save(rendered);
    const request = harness.http.expectOne({ method: 'PUT', url: `${DOCUMENTS_URL}/cv-1` });
    request.flush(DOCUMENT);

    // Then
    expect(request.request.body.jobTrackId).toBeNull();
  });

  it('Given a failing save When saved Then an error toast is shown and the changes stay unsaved', async () => {
    // Given
    const rendered = await render();
    type(rendered, 'document-markdown', '# Camille');

    // When
    await save(rendered);
    harness.http
      .expectOne({ method: 'PUT', url: `${DOCUMENTS_URL}/cv-1` })
      .flush({ message: 'Erreur' }, { status: 500, statusText: 'Server Error' });
    await rendered.fixture.whenStable();
    rendered.fixture.detectChanges();

    // Then
    expect(harness.toaster.danger).toHaveBeenCalled();
    expect(testIdText(rendered.host, 'document-save-state')).toBe('Modifications non enregistrées');
  });

  it('Given an empty title When saved Then the error is shown and nothing is sent', async () => {
    // Given
    const rendered = await render();
    type(rendered, 'document-title', '');

    // When
    await save(rendered);

    // Then
    harness.http.expectNone({ method: 'PUT' });
    expect(testIdText(rendered.host, 'document-title-error')).toBe('Le titre est requis.');
  });

  it.each([true, false])(
    'Given unsaved changes When leaving Then the user is asked and the answer (%s) decides',
    async (answer) => {
      // Given
      const rendered = await render(DOCUMENT, answer);
      type(rendered, 'document-markdown', '# Camille');

      // When
      const leave = await rendered.editor.canLeave();

      // Then
      expect(leave).toBe(answer);
      expect(harness.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Quitter sans enregistrer ?' }),
      );
    },
  );

  it('Given Markdown carrying a script, a style element and a style attribute When previewed Then none of them reaches the page', async () => {
    // Given
    const rendered = await render();

    // When
    type(
      rendered,
      'document-markdown',
      "<script>alert(1)</script>\n\n<style>body{display:none}</style>\n\n<p style='position:fixed' onclick='alert(2)'>Texte</p>",
    );

    // Then
    const sheet = preview(rendered);
    expect(sheet.querySelector('script, style, [style], [onclick]')).toBeNull();
    expect(sheet.textContent).toContain('Texte');
  });

  it('Given the editor When « Supprimer » is confirmed Then the document is deleted and the list opens without asking again', async () => {
    // Given
    const rendered = await render();
    type(rendered, 'document-markdown', '# Brouillon');

    // When
    byTestId(rendered.host, 'document-delete')?.click();
    await rendered.fixture.whenStable();
    harness.http
      .expectOne({ method: 'DELETE', url: `${DOCUMENTS_URL}/cv-1` })
      .flush(null, { status: 204, statusText: 'No Content' });
    await rendered.fixture.whenStable();

    // Then
    expect(harness.router.navigate).toHaveBeenCalledWith(['/dashboard/documents']);
    expect(rendered.editor.canLeave()).toBe(true);
  });

  it('Given a small screen When « Aperçu » is chosen Then the preview pane is shown and the editing pane hidden', async () => {
    // Given
    const rendered = await render();

    // When
    byTestId(rendered.host, 'document-pane-preview')?.click();
    rendered.fixture.detectChanges();

    // Then
    expect({
      pressed: byTestId(rendered.host, 'document-pane-preview')?.getAttribute('aria-pressed'),
      editHidden: byTestId(rendered.host, 'document-edit-pane')?.classList.contains('hidden'),
      previewHidden: byTestId(rendered.host, 'document-preview-pane')?.classList.contains('hidden'),
    }).toEqual({ pressed: 'true', editHidden: true, previewHidden: false });
  });

  it('Given an unknown document When the editor opens Then it says the document cannot be found', async () => {
    // Given
    harness = setupDocumentsTest(DocumentEditor);
    const fixture = TestBed.createComponent(DocumentEditor);
    fixture.componentRef.setInput('id', 'cv-1');
    fixture.detectChanges();

    // When
    TestBed.tick();
    harness.http
      .expectOne(`${DOCUMENTS_URL}/cv-1`)
      .flush({ message: 'Document introuvable' }, { status: 404, statusText: 'Not Found' });
    harness.http.expectOne(JOBS_URL).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    // Then
    expect(testIdText(fixture.nativeElement, 'document-not-found')).toContain('introuvable');
  });
});
