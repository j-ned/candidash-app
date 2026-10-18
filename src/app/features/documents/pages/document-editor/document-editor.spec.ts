import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { JobTrackBuilder } from '@features/jobtrack/test-utils/jobtrack.builder';
import { byTestId, testIdText } from '../../test-utils/by-test-id';
import { documentDetailApi } from '../../test-utils/document.builder';
import {
  DOCUMENTS_URL,
  JOBS_URL,
  respond,
  setupDocumentsTest,
  nextMacrotask,
  type Harness,
  type ResponseBody,
} from '../../test-utils/documents-harness';
import { DocumentEditor } from './document-editor';
import { PdfTextReader } from '../../infra/pdf-text-reader';
import type { PdfTextItem } from '../../domain/pdf-to-markdown';

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

  describe('PDF', () => {
    const PDF = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    let clicked: HTMLAnchorElement[];

    beforeEach(() => {
      clicked = [];
      URL.createObjectURL = vi.fn(() => 'blob:cv');
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        clicked.push(this);
      });
    });

    afterEach(() => vi.restoreAllMocks());

    async function settle(rendered: Rendered): Promise<void> {
      await nextMacrotask();
      await rendered.fixture.whenStable();
      rendered.fixture.detectChanges();
    }

    function flushPdf(): void {
      harness.http.expectOne({ method: 'GET', url: `${DOCUMENTS_URL}/cv-1/pdf` }).flush(PDF, {
        headers: { 'Content-Disposition': 'attachment; filename="cv-angular.pdf"' },
      });
    }

    it('Given a saved document When « PDF » is clicked Then the PDF named by the API is downloaded', async () => {
      // Given
      const rendered = await render();

      // When
      byTestId(rendered.host, 'document-export-pdf')?.click();
      await settle(rendered);
      flushPdf();
      await settle(rendered);

      // Then
      expect(URL.createObjectURL).toHaveBeenCalledWith(PDF);
      expect(clicked.map((a) => ({ href: a.href, download: a.download }))).toEqual([
        { href: 'blob:cv', download: 'cv-angular.pdf' },
      ]);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cv');
    });

    it('Given unsaved changes When « PDF » is clicked Then they are saved first, so the PDF matches the preview', async () => {
      // Given
      const rendered = await render();
      type(rendered, 'document-markdown', '# Camille');

      // When
      byTestId(rendered.host, 'document-export-pdf')?.click();
      await settle(rendered);
      harness.http
        .expectOne({ method: 'PUT', url: `${DOCUMENTS_URL}/cv-1` })
        .flush(documentDetailApi({ id: 'cv-1', markdown: '# Camille' }));
      await settle(rendered);
      flushPdf();
      await settle(rendered);

      // Then
      expect(clicked).toHaveLength(1);
    });

    it('Given the PDF service down When « PDF » is clicked Then the user is told the export is unavailable', async () => {
      // Given
      const rendered = await render();

      // When
      byTestId(rendered.host, 'document-export-pdf')?.click();
      await settle(rendered);
      harness.http
        .expectOne({ method: 'GET', url: `${DOCUMENTS_URL}/cv-1/pdf` })
        .flush(new Blob(), { status: 503, statusText: 'Service Unavailable' });
      await settle(rendered);

      // Then
      expect(harness.toaster.danger).toHaveBeenCalledWith(
        'Export PDF indisponible',
        'Le service de génération ne répond pas, réessayez plus tard.',
      );
      expect(clicked).toEqual([]);
    });

    it('Given a storage failure When « Joindre » is clicked Then the user is told the attachment failed', async () => {
      // Given
      const rendered = await render({ ...DOCUMENT, jobTrackId: 'jt-1' });

      // When
      byTestId(rendered.host, 'document-attach')?.click();
      await settle(rendered);
      harness.http
        .expectOne({ method: 'POST', url: `${DOCUMENTS_URL}/cv-1/attach` })
        .flush({ message: 'Erreur' }, { status: 500, statusText: 'Server Error' });
      await settle(rendered);

      // Then
      expect(harness.toaster.danger).toHaveBeenCalledWith(
        'Pièce jointe impossible',
        'Réessayez dans un instant.',
      );
    });

    it('Given a document linked to no application Then it cannot be attached', async () => {
      // Given / When
      const rendered = await render();

      // Then
      expect(byTestId(rendered.host, 'document-attach')).toBeNull();
    });

    it('Given a CV linked to an application When « Joindre » is clicked Then its PDF becomes the CV of the application', async () => {
      // Given
      const rendered = await render({ ...DOCUMENT, jobTrackId: 'jt-1' });

      // When
      byTestId(rendered.host, 'document-attach')?.click();
      await settle(rendered);
      harness.http
        .expectOne({ method: 'POST', url: `${DOCUMENTS_URL}/cv-1/attach` })
        .flush({ jobTrackId: 'jt-1', type: 'cv', fileName: 'cv-angular.pdf' });
      await settle(rendered);

      // Then
      expect(harness.toaster.success).toHaveBeenCalledWith(
        'CV joint à la candidature',
        '« Développeur Angular — Acme Corp » : cv-angular.pdf',
      );
    });
  });

  describe('PDF import', () => {
    const CV_PAGE: PdfTextItem[] = [
      { text: 'Camille Martin', x: 50, y: 800, fontSize: 22 },
      { text: '• Angular 22', x: 50, y: 760, fontSize: 10 },
      { text: '• NestJS', x: 50, y: 748, fontSize: 10 },
    ];
    let read: ReturnType<typeof vi.fn>;

    async function renderWithReader(pages: () => Promise<PdfTextItem[][]>): Promise<Rendered> {
      read = vi.fn(pages);
      harness = setupDocumentsTest(DocumentEditor, true, [
        { provide: PdfTextReader, useValue: { read } },
      ]);
      const fixture = TestBed.createComponent(DocumentEditor);
      fixture.componentRef.setInput('id', 'cv-1');
      fixture.detectChanges();
      await respond(fixture, harness.http, [
        { url: `${DOCUMENTS_URL}/cv-1`, body: DOCUMENT },
        { url: JOBS_URL, body: JOBS },
      ]);
      return {
        fixture,
        host: fixture.nativeElement as HTMLElement,
        editor: fixture.componentInstance,
      };
    }

    async function pick(rendered: Rendered, file: File): Promise<void> {
      const input = byTestId(rendered.host, 'document-import-input') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
      await nextMacrotask();
      await rendered.fixture.whenStable();
      rendered.fixture.detectChanges();
    }

    const pdfFile = (): File =>
      new File(['%PDF-1.7'], 'ancien-cv.pdf', { type: 'application/pdf' });
    const markdown = (rendered: Rendered): string =>
      (byTestId(rendered.host, 'document-markdown') as HTMLTextAreaElement).value;

    it('Given a PDF When it is chosen Then its text is shown as Markdown before anything is replaced', async () => {
      // Given
      const rendered = await renderWithReader(() => Promise.resolve([CV_PAGE]));

      // When
      await pick(rendered, pdfFile());

      // Then
      expect(read).toHaveBeenCalledWith(expect.objectContaining({ name: 'ancien-cv.pdf' }));
      const panel = byTestId(rendered.host, 'document-import-panel');
      expect(panel?.querySelector('[data-testid="document-preview"] h2')?.textContent).toBe(
        'Camille Martin',
      );
      expect(panel?.querySelectorAll('li')).toHaveLength(2);
      expect(markdown(rendered)).toBe('# Camille Martin\n\n## Expérience');
    });

    it('Given the extracted text When « Remplacer » is clicked Then it becomes the unsaved content', async () => {
      // Given
      const rendered = await renderWithReader(() => Promise.resolve([CV_PAGE]));
      await pick(rendered, pdfFile());

      // When
      byTestId(rendered.host, 'document-import-replace')?.click();
      rendered.fixture.detectChanges();

      // Then
      expect(markdown(rendered)).toBe('# Camille Martin\n\n- Angular 22\n- NestJS');
      expect(byTestId(rendered.host, 'document-import-panel')).toBeNull();
      expect(testIdText(rendered.host, 'document-save-state')).toBe(
        'Modifications non enregistrées',
      );
    });

    it('Given the extracted text When « Annuler » is clicked Then the content is kept', async () => {
      // Given
      const rendered = await renderWithReader(() => Promise.resolve([CV_PAGE]));
      await pick(rendered, pdfFile());

      // When
      byTestId(rendered.host, 'document-import-cancel')?.click();
      rendered.fixture.detectChanges();

      // Then
      expect(byTestId(rendered.host, 'document-import-panel')).toBeNull();
      expect(markdown(rendered)).toBe('# Camille Martin\n\n## Expérience');
    });

    it('Given a file that is not a PDF When it is chosen Then it is refused without being read', async () => {
      // Given
      const rendered = await renderWithReader(() => Promise.resolve([CV_PAGE]));

      // When
      await pick(rendered, new File(['texte'], 'cv.docx', { type: 'application/msword' }));

      // Then
      expect(read).not.toHaveBeenCalled();
      expect(harness.toaster.danger).toHaveBeenCalledWith(
        'Format non pris en charge',
        'Choisissez un fichier PDF de 5 Mo au plus.',
      );
    });

    it.each([
      [
        'a scanned PDF',
        () => Promise.resolve([[]]),
        'Aucun texte trouvé',
        'Ce PDF est sans doute une image (scan) : son texte ne peut pas être lu.',
      ],
      [
        'an unreadable PDF',
        () => Promise.reject(new Error('Invalid PDF structure')),
        'Lecture du PDF impossible',
        'Le fichier est peut-être protégé ou endommagé.',
      ],
    ])(
      'Given %s When it is chosen Then the user is told why',
      async (_case, pages, title, message) => {
        // Given
        const rendered = await renderWithReader(pages);

        // When
        await pick(rendered, pdfFile());

        // Then
        expect(harness.toaster.danger).toHaveBeenCalledWith(title, message);
        expect(byTestId(rendered.host, 'document-import-panel')).toBeNull();
      },
    );
  });

  describe('analysis', () => {
    function openAnalysis(rendered: Rendered): void {
      byTestId(rendered.host, 'document-analysis-toggle')?.click();
      rendered.fixture.detectChanges();
    }

    it('Given the editor Then the analysis stays closed and loads nothing', async () => {
      // Given / When
      const rendered = await render({ ...DOCUMENT, jobTrackId: 'jt-1' });

      // Then
      expect(
        byTestId(rendered.host, 'document-analysis-toggle')?.getAttribute('aria-expanded'),
      ).toBe('false');
      harness.http.expectNone(`${JOBS_URL}/jt-1`);
    });

    it('Given a document linked to an application with an offer When the analysis opens Then the document is compared to the offer', async () => {
      // Given
      const rendered = await render({ ...DOCUMENT, jobTrackId: 'jt-1' });

      // When
      openAnalysis(rendered);
      await respond(rendered.fixture, harness.http, [
        {
          url: `${JOBS_URL}/jt-1`,
          body: { ...JOBS[0], offerText: 'Angular, NestJS et Docker. Angular avant tout.' },
        },
      ]);

      // Then
      expect(
        byTestId(rendered.host, 'document-analysis-toggle')?.getAttribute('aria-expanded'),
      ).toBe('true');
      expect(testIdText(rendered.host, 'analysis-score')).toBe('0 mots-clés sur 3 (0 %)');
    });

    it('Given a document linked to no application When the analysis opens Then it explains how to compare with an offer', async () => {
      // Given
      const rendered = await render();

      // When
      openAnalysis(rendered);

      // Then
      expect(testIdText(rendered.host, 'analysis-no-offer')).toContain('Liez ce document');
      expect(byTestId(rendered.host, 'analysis-check')).not.toBeNull();
    });
  });
});
