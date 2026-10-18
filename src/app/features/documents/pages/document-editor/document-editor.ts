import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, FormRoot, form, maxLength, required, submit } from '@angular/forms/signals';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import { toJobTrack } from '@features/jobtrack/infra/jobtrack.adapter';
import type { JobTrackApi } from '@features/jobtrack/infra/jobtrack.types';
import type { JobTrack } from '@features/jobtrack/domain/models/jobtrack.model';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { ConfirmModal } from '@shared/ui/confirm-modal/confirm-modal';
import { FieldError } from '@shared/ui/field-error/field-error';
import { Icon } from '@shared/ui/icon/icon';
import { Layout } from '@shared/ui/layout/layout';
import { Toaster } from '@shared/ui/toast/service/toast';
import {
  DOCUMENT_MARKDOWN_MAX,
  DOCUMENT_TITLE_MAX,
  type DocumentDetail,
} from '../../domain/models/document.model';
import { toDocumentDetail } from '../../infra/document.adapter';
import type { DocumentDetailApi } from '../../infra/document.types';
import { HttpDocumentsGateway } from '../../infra/http-documents.gateway';
import type { LeaveConfirmable } from '../../application/unsaved-changes-guard';
import { downloadFile } from '../../application/download-file';
import { pdfToMarkdown } from '../../domain/pdf-to-markdown';
import { PDF_IMPORT_MAX_BYTES, PdfTextReader } from '../../infra/pdf-text-reader';
import { DocumentAnalysis } from '../../application/components/document-analysis';
import { DocumentSheet } from '../../application/components/document-sheet';
import { MarkdownEditor } from '../../application/components/markdown-editor';
import { MarkdownToolbar } from '../../application/components/markdown-toolbar';

type DocumentDraft = { title: string; markdown: string; jobTrackId: string };

type Pane = 'edit' | 'preview';

type PdfAction = 'export' | 'attach';

type ImportedPdf = { readonly fileName: string; readonly markdown: string };

const EMPTY_DRAFT: DocumentDraft = { title: '', markdown: '', jobTrackId: '' };

const KIND_LABELS = { CV: 'CV', LETTER: 'Lettre de motivation' } as const;

const FIELD_CLASS =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-text focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-invalid:border-error';

const SECONDARY_BUTTON =
  'inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text hover:bg-surface-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60';

const ATTACHED_LABELS = { cv: 'CV joint', lm: 'Lettre jointe' } as const;

const PANE_BUTTON =
  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted aria-pressed:bg-card aria-pressed:text-text aria-pressed:shadow-sm focus-visible:outline-2 focus-visible:outline-primary';

function toDraft(document: DocumentDetail | undefined): DocumentDraft {
  if (!document) return EMPTY_DRAFT;
  return {
    title: document.title,
    markdown: document.markdown,
    jobTrackId: document.jobTrackId ?? '',
  };
}

function sameDraft(a: DocumentDraft, b: DocumentDraft): boolean {
  return a.title === b.title && a.markdown === b.markdown && a.jobTrackId === b.jobTrackId;
}

@Component({
  selector: 'app-document-editor',
  imports: [
    Layout,
    RouterLink,
    Icon,
    FormRoot,
    FormField,
    FieldError,
    MarkdownEditor,
    MarkdownToolbar,
    DocumentSheet,
    DocumentAnalysis,
  ],
  host: { '(window:beforeunload)': 'warnBeforeUnload($event)' },
  template: `
    <app-layout>
      <a
        routerLink="/dashboard/documents"
        class="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text"
      >
        <app-icon name="lucide-arrow-left" cssClass="h-4 w-4" />
        Mes documents
      </a>

      @if (documentResource.error()) {
        <div data-testid="document-not-found" role="alert" class="space-y-2">
          <h1 class="text-2xl font-bold text-text">Document introuvable</h1>
          <p class="text-muted">Il a peut-être été supprimé.</p>
        </div>
      } @else if (ready()) {
        <form data-testid="document-form" [formRoot]="docForm" class="space-y-6">
          <header class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wider text-muted">
                {{ kindLabel() }}
              </p>
              <h1 class="truncate text-2xl font-bold text-text">{{ savedTitle() }}</h1>
              <p
                data-testid="document-save-state"
                role="status"
                class="text-sm"
                [class.text-warning]="dirty()"
                [class.text-muted]="!dirty()"
              >
                {{ dirty() ? 'Modifications non enregistrées' : 'Tout est enregistré' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <input
                #importInput
                type="file"
                accept="application/pdf"
                data-testid="document-import-input"
                class="hidden"
                (change)="importPdf($event)"
              />
              <button
                type="button"
                data-testid="document-import"
                [disabled]="importing()"
                [attr.aria-busy]="importing()"
                [class]="secondaryButton"
                (click)="importInput.click()"
              >
                <app-icon name="lucide-upload" cssClass="h-4 w-4" />
                {{ importing() ? 'Lecture…' : 'Importer un PDF' }}
              </button>
              <button
                type="button"
                data-testid="document-export-pdf"
                [disabled]="pdfAction() !== null"
                [attr.aria-busy]="pdfAction() === 'export'"
                [class]="secondaryButton"
                (click)="exportPdf()"
              >
                <app-icon name="lucide-download" cssClass="h-4 w-4" />
                {{ pdfAction() === 'export' ? 'Génération…' : 'PDF' }}
              </button>
              @if (linkedJob(); as job) {
                <button
                  type="button"
                  data-testid="document-attach"
                  [disabled]="pdfAction() !== null"
                  [attr.aria-busy]="pdfAction() === 'attach'"
                  [attr.aria-label]="'Joindre le PDF à la candidature « ' + job + ' »'"
                  [class]="secondaryButton"
                  (click)="attachPdf()"
                >
                  <app-icon name="lucide-paperclip" cssClass="h-4 w-4" />
                  {{ pdfAction() === 'attach' ? 'Envoi…' : 'Joindre à la candidature' }}
                </button>
              }
              <button
                type="button"
                data-testid="document-delete"
                class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
                (click)="deleteDocument()"
              >
                <app-icon name="lucide-trash-2" cssClass="h-4 w-4" />
                Supprimer
              </button>
              <button
                type="submit"
                data-testid="document-save"
                [disabled]="docForm().submitting()"
                class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
              >
                <app-icon name="lucide-save" cssClass="h-4 w-4" />
                {{ docForm().submitting() ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </header>

          <fieldset class="grid gap-4 sm:grid-cols-2">
            <legend class="sr-only">Informations du document</legend>
            <div class="space-y-1">
              @let titleInError = docForm.title().touched() && docForm.title().invalid();
              <label for="document-title" class="block text-sm font-medium text-text">Titre</label>
              <input
                id="document-title"
                data-testid="document-title"
                [formField]="docForm.title"
                aria-required="true"
                [attr.aria-invalid]="titleInError"
                [attr.aria-describedby]="titleInError ? 'document-title-error' : null"
                [class]="fieldClass"
              />
              <app-field-error
                [field]="docForm.title"
                errorId="document-title-error"
                testId="document-title-error"
              />
            </div>
            <div class="space-y-1">
              <label for="document-job" class="block text-sm font-medium text-text"
                >Lier à une candidature</label
              >
              <select
                id="document-job"
                data-testid="document-job"
                [formField]="docForm.jobTrackId"
                [class]="fieldClass"
              >
                <option value="">Aucune</option>
                @for (job of jobs(); track job.id) {
                  <option [value]="job.id" [selected]="job.id === docForm.jobTrackId().value()">
                    {{ job.label }}
                  </option>
                }
              </select>
            </div>
          </fieldset>

          @if (imported(); as pdf) {
            <section
              data-testid="document-import-panel"
              aria-labelledby="document-import-title"
              class="space-y-4 rounded-xl border border-primary/40 bg-card p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <h2
                    #importTitle
                    id="document-import-title"
                    tabindex="-1"
                    class="font-semibold text-text focus:outline-none"
                  >
                    Texte extrait de « {{ pdf.fileName }} »
                  </h2>
                  <p class="text-sm text-muted">
                    La mise en page d'origine est perdue : vérifiez les titres et les puces après
                    l'import.
                    @if (docForm.markdown().value().trim()) {
                      Le contenu actuel sera remplacé.
                    }
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    data-testid="document-import-cancel"
                    [class]="secondaryButton"
                    (click)="imported.set(null)"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    data-testid="document-import-replace"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    (click)="replaceWithImport(pdf.markdown)"
                  >
                    Remplacer le contenu
                  </button>
                </div>
              </div>
              <div class="max-h-[60vh] overflow-y-auto rounded-lg bg-surface-200 p-4">
                <app-document-sheet [markdown]="pdf.markdown" />
              </div>
            </section>
          }

          <div
            role="group"
            aria-label="Affichage"
            class="flex gap-1 rounded-lg bg-surface-200 p-1 lg:hidden"
          >
            <button
              type="button"
              data-testid="document-pane-edit"
              [attr.aria-pressed]="pane() === 'edit'"
              [class]="paneButton"
              (click)="pane.set('edit')"
            >
              Édition
            </button>
            <button
              type="button"
              data-testid="document-pane-preview"
              [attr.aria-pressed]="pane() === 'preview'"
              [class]="paneButton"
              (click)="pane.set('preview')"
            >
              Aperçu
            </button>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <div
              data-testid="document-edit-pane"
              class="lg:block"
              [class.hidden]="pane() !== 'edit'"
            >
              @let markdownInError = docForm.markdown().touched() && docForm.markdown().invalid();
              <label for="document-markdown" class="mb-1 block text-sm font-medium text-text"
                >Contenu (Markdown)</label
              >
              <app-markdown-toolbar [editor]="markdownEditor" />
              <textarea
                id="document-markdown"
                data-testid="document-markdown"
                appMarkdownEditor
                #markdownEditor="markdownEditor"
                [formField]="docForm.markdown"
                rows="28"
                spellcheck="true"
                [attr.aria-invalid]="markdownInError"
                [attr.aria-describedby]="markdownInError ? 'document-markdown-error' : null"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed text-text focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              ></textarea>
              <app-field-error
                [field]="docForm.markdown"
                errorId="document-markdown-error"
                testId="document-markdown-error"
              />
            </div>
            <section
              data-testid="document-preview-pane"
              aria-label="Aperçu du document"
              class="lg:block"
              [class.hidden]="pane() !== 'preview'"
            >
              <app-document-sheet [markdown]="docForm.markdown().value()" />
            </section>
          </div>

          <section
            aria-labelledby="document-analysis-title"
            class="rounded-xl border border-border bg-card"
          >
            <h2 id="document-analysis-title">
              <button
                type="button"
                data-testid="document-analysis-toggle"
                aria-controls="document-analysis-panel"
                [attr.aria-expanded]="analysisOpen()"
                class="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left font-semibold text-text hover:bg-surface-200 focus-visible:outline-2 focus-visible:outline-primary"
                (click)="analysisOpen.update((open) => !open)"
              >
                Analyse du document (ATS et offre)
                <app-icon
                  [name]="analysisOpen() ? 'lucide-chevron-up' : 'lucide-chevron-down'"
                  cssClass="h-4 w-4 text-muted"
                />
              </button>
            </h2>
            @if (analysisOpen()) {
              <div id="document-analysis-panel" class="border-t border-border p-4">
                <app-document-analysis
                  [kind]="document()?.kind ?? 'CV'"
                  [markdown]="docForm.markdown().value()"
                  [offerText]="linkedOffer()"
                  [jobLabel]="selectedJobLabel()"
                />
              </div>
            }
          </section>
        </form>
      } @else {
        <p class="text-sm text-muted">Chargement…</p>
      }
    </app-layout>
  `,
})
export class DocumentEditor implements LeaveConfirmable {
  private readonly gateway = inject(HttpDocumentsGateway);
  private readonly jobtrackGateway = inject(JobtrackGateway);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
  private readonly confirmModal = inject(ConfirmModal);
  private readonly dom = inject(DOCUMENT);
  private readonly pdfReader = inject(PdfTextReader);
  private readonly injector = inject(Injector);

  readonly id = input.required<string>();

  private readonly importTitle = viewChild<ElementRef<HTMLElement>>('importTitle');

  protected readonly documentResource = httpResource<DocumentDetail>(
    () => this.gateway.detailUrl(this.id()),
    { parse: (raw) => toDocumentDetail(raw as DocumentDetailApi) },
  );
  private readonly jobsResource = httpResource<JobTrack[]>(() => this.jobtrackGateway.listUrl(), {
    parse: (raw) => (raw as JobTrackApi[]).map(toJobTrack),
  });

  protected readonly fieldClass = FIELD_CLASS;
  protected readonly paneButton = PANE_BUTTON;
  protected readonly secondaryButton = SECONDARY_BUTTON;
  protected readonly pdfAction = signal<PdfAction | null>(null);
  protected readonly importing = signal(false);
  protected readonly imported = signal<ImportedPdf | null>(null);
  protected readonly analysisOpen = signal(false);
  protected readonly pane = signal<Pane>('edit');

  protected readonly document = computed(() =>
    this.documentResource.hasValue() ? this.documentResource.value() : undefined,
  );
  // Version enregistrée : point de comparaison de l'indicateur et de la garde de sortie.
  private readonly saved = linkedSignal(() => toDraft(this.document()));
  private readonly model = linkedSignal(() => toDraft(this.document()));

  protected readonly docForm = form(
    this.model,
    (path) => {
      required(path.title, { message: 'Le titre est requis.' });
      maxLength(path.title, DOCUMENT_TITLE_MAX, {
        message: `Le titre ne peut pas dépasser ${DOCUMENT_TITLE_MAX} caractères.`,
      });
      maxLength(path.markdown, DOCUMENT_MARKDOWN_MAX, {
        message: 'Le document dépasse 50 000 caractères.',
      });
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  // Le select des candidatures n'est rendu qu'avec ses options : sinon le navigateur afficherait
  // « Aucune » pour un document déjà lié (valeur posée avant que l'option n'existe).
  protected readonly ready = computed(
    () => this.document() !== undefined && !this.jobsResource.isLoading(),
  );
  protected readonly jobs = computed(() =>
    (this.jobsResource.hasValue() ? this.jobsResource.value() : []).map((job) => ({
      id: job.id,
      label: job.company ? `${job.title} — ${job.company}` : job.title,
    })),
  );
  // Candidature enregistrée (et non celle choisie sans enregistrer) : c'est elle que vise l'API.
  protected readonly linkedJob = computed(() => {
    const jobTrackId = this.saved().jobTrackId;
    return jobTrackId ? (this.jobs().find((job) => job.id === jobTrackId)?.label ?? null) : null;
  });
  // Candidature choisie dans le formulaire : l'analyse suit la sélection, même non enregistrée.
  private readonly selectedJobId = computed(() => this.model().jobTrackId);
  protected readonly selectedJobLabel = computed(
    () => this.jobs().find((job) => job.id === this.selectedJobId())?.label ?? null,
  );
  // Le texte de l'offre n'est que sur le détail : chargé seulement quand l'analyse est ouverte.
  private readonly selectedJobResource = httpResource<JobTrack>(
    () => {
      const id = this.selectedJobId();
      return this.analysisOpen() && id ? this.jobtrackGateway.getUrl(id) : undefined;
    },
    { parse: (raw) => toJobTrack(raw as JobTrackApi) },
  );
  protected readonly linkedOffer = computed(() =>
    this.selectedJobResource.hasValue()
      ? (this.selectedJobResource.value().offerText ?? null)
      : null,
  );
  protected readonly dirty = computed(() => !sameDraft(this.model(), this.saved()));
  protected readonly savedTitle = computed(() => this.saved().title);
  protected readonly kindLabel = computed(() => KIND_LABELS[this.document()?.kind ?? 'CV']);

  async saveDocument(): Promise<void> {
    await submit(this.docForm);
  }

  async exportPdf(): Promise<void> {
    await this.withSavedDocument('export', async () => {
      const { blob, fileName } = await firstValueFrom(this.gateway.pdf(this.id()));
      downloadFile(this.dom, blob, fileName);
    });
  }

  async attachPdf(): Promise<void> {
    const job = this.linkedJob();
    await this.withSavedDocument('attach', async () => {
      const { type, fileName } = await firstValueFrom(this.gateway.attach(this.id()));
      this.toaster.success(`${ATTACHED_LABELS[type]} à la candidature`, `« ${job} » : ${fileName}`);
    });
  }

  /** Le texte du PDF est lu dans le navigateur, puis proposé en aperçu avant de remplacer quoi que ce soit. */
  async importPdf(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' || file.size > PDF_IMPORT_MAX_BYTES) {
      this.toaster.danger(
        'Format non pris en charge',
        'Choisissez un fichier PDF de 5 Mo au plus.',
      );
      return;
    }
    this.importing.set(true);
    try {
      const markdown = pdfToMarkdown(await this.pdfReader.read(file));
      if (!markdown) {
        this.toaster.danger(
          'Aucun texte trouvé',
          'Ce PDF est sans doute une image (scan) : son texte ne peut pas être lu.',
        );
        return;
      }
      this.imported.set({ fileName: file.name, markdown });
      afterNextRender(() => this.importTitle()?.nativeElement.focus(), { injector: this.injector });
    } catch {
      this.toaster.danger(
        'Lecture du PDF impossible',
        'Le fichier est peut-être protégé ou endommagé.',
      );
    } finally {
      this.importing.set(false);
    }
  }

  protected replaceWithImport(markdown: string): void {
    this.model.update((draft) => ({ ...draft, markdown }));
    this.imported.set(null);
    this.toaster.success('Texte importé', 'Relisez-le, puis enregistrez le document.');
  }

  canLeave(): boolean | Promise<boolean> {
    if (!this.dirty()) return true;
    return this.confirmModal.confirm({
      title: 'Quitter sans enregistrer ?',
      message: 'Les modifications non enregistrées de ce document seront perdues.',
      confirmText: 'Quitter',
      cancelText: 'Rester',
      type: 'warning',
    });
  }

  async deleteDocument(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: `Supprimer « ${this.saved().title} » ?`,
      message: 'Le document sera définitivement supprimé. Ses déclinaisons sont conservées.',
      confirmText: 'Supprimer',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await firstValueFrom(this.gateway.delete(this.id()));
    } catch {
      this.toaster.danger('Suppression impossible', 'Réessayez dans un instant.');
      return;
    }
    // Plus rien à protéger : la garde de sortie ne doit pas redemander.
    this.saved.set(this.model());
    this.toaster.success('Document supprimé');
    await this.router.navigate(['/dashboard/documents']);
  }

  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
  }

  // Le PDF part de la version enregistrée : les modifications en cours sont d'abord enregistrées,
  // pour que le fichier corresponde à l'aperçu. Un enregistrement refusé arrête l'action.
  private async withSavedDocument(action: PdfAction, run: () => Promise<void>): Promise<void> {
    if (this.pdfAction()) return;
    this.pdfAction.set(action);
    try {
      if (this.dirty()) await this.saveDocument();
      if (this.dirty()) return;
      await run();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 503) {
        this.toaster.danger(
          'Export PDF indisponible',
          'Le service de génération ne répond pas, réessayez plus tard.',
        );
      } else {
        this.toaster.danger(
          action === 'export' ? 'Génération du PDF impossible' : 'Pièce jointe impossible',
          'Réessayez dans un instant.',
        );
      }
    } finally {
      this.pdfAction.set(null);
    }
  }

  // Le brouillon envoyé devient la référence : ce qui est tapé pendant la requête reste « non enregistré ».
  private async save(): Promise<void> {
    const draft = this.model();
    try {
      await firstValueFrom(
        this.gateway.update(this.id(), {
          title: draft.title.trim(),
          markdown: draft.markdown,
          jobTrackId: draft.jobTrackId === '' ? null : draft.jobTrackId,
        }),
      );
    } catch {
      this.toaster.danger(
        'Enregistrement impossible',
        'Vos modifications sont conservées, réessayez.',
      );
      return;
    }
    this.saved.set(draft);
    this.toaster.success('Document enregistré');
  }
}
