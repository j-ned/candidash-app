import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import { toJobTrack } from '@features/jobtrack/infra/jobtrack.adapter';
import type { JobTrackApi } from '@features/jobtrack/infra/jobtrack.types';
import type { JobTrack } from '@features/jobtrack/domain/models/jobtrack.model';
import { ConfirmModal } from '@shared/ui/confirm-modal/confirm-modal';
import { Icon } from '@shared/ui/icon/icon';
import { Layout } from '@shared/ui/layout/layout';
import { Toaster } from '@shared/ui/toast/service/toast';
import { starterDocument } from '../../domain/document-templates';
import type { DocumentKind, DocumentSummary } from '../../domain/models/document.model';
import { toDocumentSummaries } from '../../infra/document.adapter';
import type { DocumentSummaryApi } from '../../infra/document.types';
import { HttpDocumentsGateway } from '../../infra/http-documents.gateway';
import { updatedSince } from '../../application/updated-since';

type DocumentItem = {
  readonly document: DocumentSummary;
  readonly updated: string;
  readonly baseTitle: string | null;
  readonly jobTitle: string | null;
};

type DocumentSection = {
  readonly kind: DocumentKind;
  readonly heading: string;
  readonly createLabel: string;
  readonly empty: string;
  readonly items: readonly DocumentItem[];
};

const SECTIONS: readonly Omit<DocumentSection, 'items'>[] = [
  {
    kind: 'CV',
    heading: 'CV',
    createLabel: 'Nouveau CV',
    empty: 'Aucun CV pour l’instant. Partez du modèle pour écrire le vôtre.',
  },
  {
    kind: 'LETTER',
    heading: 'Lettres de motivation',
    createLabel: 'Nouvelle lettre',
    empty: 'Aucune lettre pour l’instant. Le modèle reprend la structure attendue.',
  },
];

const SECONDARY_BUTTON =
  'inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60';

@Component({
  selector: 'app-documents',
  imports: [Layout, RouterLink, Icon],
  template: `
    <app-layout>
      <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <a
            routerLink="/dashboard"
            class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-text"
          >
            <app-icon name="lucide-arrow-left" cssClass="h-4 w-4" />
            Dashboard
          </a>
          <h1 class="text-2xl font-bold text-text sm:text-3xl">Mes documents</h1>
          <p class="text-sm text-muted">
            Vos CV et lettres de motivation, à décliner pour chaque candidature.
          </p>
        </div>
      </header>

      @if (documentsResource.error()) {
        <p role="alert" class="mb-6 text-sm text-error">
          Les documents n’ont pas pu être chargés.
          <button type="button" class="underline" (click)="documentsResource.reload()">
            Réessayer
          </button>
        </p>
      }

      <div class="space-y-10">
        @for (section of sections(); track section.kind) {
          <section
            [attr.data-testid]="'documents-section-' + section.kind"
            [attr.aria-labelledby]="'documents-heading-' + section.kind"
          >
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2
                [id]="'documents-heading-' + section.kind"
                class="text-xl font-semibold text-text"
              >
                {{ section.heading }}
              </h2>
              <button
                type="button"
                [attr.data-testid]="'documents-create-' + section.kind"
                [disabled]="pending()"
                class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                (click)="createDocument(section.kind)"
              >
                <app-icon name="lucide-plus" cssClass="h-4 w-4" />
                {{ section.createLabel }}
              </button>
            </div>

            @if (documentsResource.isLoading() && !documentsResource.hasValue()) {
              <p class="text-sm text-muted">Chargement…</p>
            } @else {
              <ul class="space-y-3">
                @for (item of section.items; track item.document.id) {
                  <li
                    data-testid="document-item"
                    class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
                  >
                    <div class="min-w-0">
                      <a
                        data-testid="document-title"
                        [routerLink]="[item.document.id]"
                        class="font-semibold text-text hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                        >{{ item.document.title }}</a
                      >
                      <p data-testid="document-updated" class="text-xs text-muted">
                        Modifié {{ item.updated }}
                      </p>
                      @if (item.baseTitle) {
                        <p data-testid="document-base" class="text-xs text-muted">
                          Déclinaison de « {{ item.baseTitle }} »
                        </p>
                      }
                      @if (item.jobTitle) {
                        <p data-testid="document-job" class="text-xs text-muted">
                          Candidature : {{ item.jobTitle }}
                        </p>
                      }
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        data-testid="document-duplicate"
                        [attr.aria-label]="'Dupliquer « ' + item.document.title + ' »'"
                        [disabled]="pending()"
                        [class]="secondaryButton"
                        (click)="duplicateDocument(item.document)"
                      >
                        <app-icon name="lucide-copy" cssClass="h-4 w-4" />
                        Dupliquer
                      </button>
                      <button
                        type="button"
                        data-testid="document-delete"
                        [attr.aria-label]="'Supprimer « ' + item.document.title + ' »'"
                        [disabled]="pending()"
                        [class]="secondaryButton"
                        (click)="deleteDocument(item.document)"
                      >
                        <app-icon name="lucide-trash-2" cssClass="h-4 w-4 text-error" />
                        Supprimer
                      </button>
                    </div>
                  </li>
                } @empty {
                  <li
                    [attr.data-testid]="'documents-empty-' + section.kind"
                    class="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted"
                  >
                    {{ section.empty }}
                  </li>
                }
              </ul>
            }
          </section>
        }
      </div>
    </app-layout>
  `,
})
export class Documents {
  private readonly gateway = inject(HttpDocumentsGateway);
  private readonly jobtrackGateway = inject(JobtrackGateway);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
  private readonly confirmModal = inject(ConfirmModal);

  protected readonly documentsResource = httpResource<DocumentSummary[]>(
    () => this.gateway.listUrl(),
    { parse: (raw) => toDocumentSummaries(raw as DocumentSummaryApi[]) },
  );
  private readonly jobsResource = httpResource<JobTrack[]>(() => this.jobtrackGateway.listUrl(), {
    parse: (raw) => (raw as JobTrackApi[]).map(toJobTrack),
  });

  protected readonly secondaryButton = SECONDARY_BUTTON;
  protected readonly pending = signal(false);

  protected readonly sections = computed<readonly DocumentSection[]>(() => {
    const documents = this.documentsResource.hasValue() ? this.documentsResource.value() : [];
    const jobs = this.jobsResource.hasValue() ? this.jobsResource.value() : [];
    const titles = new Map(documents.map((document) => [document.id, document.title]));
    const jobTitles = new Map(jobs.map((job) => [job.id, job.title]));
    const now = new Date();
    const toItem = (document: DocumentSummary): DocumentItem => ({
      document,
      updated: updatedSince(document.updatedAt, now),
      baseTitle: document.baseDocumentId ? (titles.get(document.baseDocumentId) ?? null) : null,
      jobTitle: document.jobTrackId ? (jobTitles.get(document.jobTrackId) ?? null) : null,
    });
    return SECTIONS.map((section) => ({
      ...section,
      items: documents.filter((document) => document.kind === section.kind).map(toItem),
    }));
  });

  async createDocument(kind: DocumentKind): Promise<void> {
    await this.run(async () => {
      const created = await firstValueFrom(this.gateway.create({ kind, ...starterDocument(kind) }));
      await this.router.navigate(['/dashboard/documents', created.id]);
    }, 'Création impossible');
  }

  async duplicateDocument(document: DocumentSummary): Promise<void> {
    await this.run(async () => {
      const copy = await firstValueFrom(this.gateway.duplicate(document.id, {}));
      this.toaster.success('Copie créée', copy.title);
      this.documentsResource.reload();
    }, 'Copie impossible');
  }

  async deleteDocument(document: DocumentSummary): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: `Supprimer « ${document.title} » ?`,
      message: 'Le document sera définitivement supprimé. Ses déclinaisons sont conservées.',
      confirmText: 'Supprimer',
      type: 'danger',
    });
    if (!confirmed) return;
    await this.run(async () => {
      await firstValueFrom(this.gateway.delete(document.id));
      this.toaster.success('Document supprimé');
      this.documentsResource.reload();
    }, 'Suppression impossible');
  }

  // Une action à la fois : les boutons sont désactivés le temps de la requête.
  private async run(action: () => Promise<void>, failure: string): Promise<void> {
    this.pending.set(true);
    try {
      await action();
    } catch {
      this.toaster.danger(failure, 'Réessayez dans un instant.');
    } finally {
      this.pending.set(false);
    }
  }
}
