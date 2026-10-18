import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  model,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { CdkDrag, CdkDropList, CdkDropListGroup, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import {
  ALL_STATUSES,
  CONTRACT_TYPE_CONFIG,
  STATUS_CONFIG,
  type JobStatus,
  type JobTrack,
} from '@features/jobtrack/domain/models/jobtrack.model';
import {
  COLUMN_TITLES,
  groupByStatus,
  moveJob,
  relativeDate,
  replaceJob,
  statusChangePayload,
} from '@features/jobtrack/domain/job-board';
import { Toaster } from '@shared/ui/toast/service/toast';

type BoardCard = {
  id: string;
  job: JobTrack;
  title: string;
  company: string | null;
  contract: { label: string; badgeClass: string } | null;
  dateIso: string;
  dateLabel: string;
};

const STATUS_OPTIONS = ALL_STATUSES.map((status) => ({
  value: status,
  label: STATUS_CONFIG[status].label,
}));

const COLUMN_ACCENTS: Record<JobStatus, string> = {
  TO_APPLY: 'border-t-muted',
  APPLIED: 'border-t-info',
  INTERVIEW: 'border-t-accent',
  ACCEPTED: 'border-t-success',
  REJECTED: 'border-t-error',
};

/** Glisser au toucher seulement après un appui maintenu : le défilement horizontal reste libre. */
const DRAG_START_DELAY = { touch: 250, mouse: 0 };

/**
 * Tableau Kanban des candidatures : une colonne par statut. Le déplacement (glisser-déposer ou
 * menu « Changer de statut » au clavier) est optimiste : la carte bouge tout de suite, puis
 * reprend sa place avec un toast si l'enregistrement échoue. `jobs` est partagé avec le parent
 * (`model`) pour que la vue liste reflète aussitôt le nouveau statut.
 */
@Component({
  selector: 'app-jobtrack-board',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag],
  host: { class: 'block min-w-0' },
  template: `
    <p class="mb-3 text-sm text-muted" id="board-help">
      Glissez une carte vers une autre colonne, ou utilisez le menu « Changer de statut » de la
      carte.
    </p>
    <div
      cdkDropListGroup
      class="-mx-1 flex snap-x items-start gap-4 overflow-x-auto px-1 pb-4 xl:grid xl:grid-cols-5 xl:snap-none xl:overflow-visible"
      data-testid="board"
    >
      @for (column of columns(); track column.status) {
        <section
          [attr.aria-labelledby]="'board-column-title-' + column.status"
          [attr.data-testid]="'board-column-' + column.status"
          class="flex max-h-[min(72dvh,46rem)] w-72 shrink-0 snap-start flex-col rounded-xl border border-t-4 border-border bg-surface-100 xl:w-auto xl:min-w-0"
          [class]="column.accent"
        >
          <h3
            [id]="'board-column-title-' + column.status"
            class="flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-text"
          >
            {{ column.title }}
            <span
              class="rounded-full bg-muted/15 px-2 py-0.5 text-xs tabular-nums text-muted"
              [attr.data-testid]="'board-column-count-' + column.status"
            >
              {{ column.count }}
            </span>
          </h3>
          <ul
            cdkDropList
            cdkDropListSortingDisabled
            [cdkDropListData]="column.status"
            (cdkDropListDropped)="drop($event)"
            class="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-2"
          >
            @for (card of column.cards; track card.id) {
              <li
                cdkDrag
                [cdkDragData]="card.job"
                [cdkDragStartDelay]="dragStartDelay"
                (cdkDragStarted)="markDragged()"
                (pointerdown)="clearDragged()"
                data-testid="board-card"
                class="relative cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 active:cursor-grabbing"
              >
                <a
                  [href]="'/dashboard/jobtrack/' + card.id"
                  (click)="open($event, card.id)"
                  data-testid="board-card-title"
                  class="block font-medium text-text after:absolute after:inset-0 after:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {{ card.title }}
                </a>
                @if (card.company) {
                  <p class="mt-0.5 truncate text-sm text-muted">{{ card.company }}</p>
                }
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  @if (card.contract) {
                    <span
                      data-testid="board-card-contract"
                      class="rounded-full border px-2 py-0.5 font-medium"
                      [class]="card.contract.badgeClass"
                    >
                      {{ card.contract.label }}
                    </span>
                  }
                  <time [attr.datetime]="card.dateIso">{{ card.dateLabel }}</time>
                </div>
                <div class="relative z-10 mt-3">
                  <label [for]="'board-status-' + card.id" class="sr-only">
                    Changer de statut : {{ card.title }}
                  </label>
                  <select
                    [id]="'board-status-' + card.id"
                    data-testid="board-card-status"
                    aria-describedby="board-help"
                    class="w-full cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    (change)="changeStatus(card.job, $event)"
                  >
                    @for (option of statusOptions; track option.value) {
                      <option [value]="option.value" [selected]="option.value === card.job.status">
                        {{ option.label }}
                      </option>
                    }
                  </select>
                </div>
              </li>
            } @empty {
              <li
                class="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted"
              >
                Aucune candidature
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class JobtrackBoard {
  private readonly router = inject(Router);
  private readonly gateway = inject(JobtrackGateway);
  private readonly toast = inject(Toaster);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly jobs = model.required<JobTrack[]>();

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly dragStartDelay = DRAG_START_DELAY;

  protected readonly columns = computed(() => {
    const now = new Date();
    return groupByStatus(this.jobs()).map((column) => ({
      ...column,
      accent: COLUMN_ACCENTS[column.status],
      cards: column.jobs.map((job) => toCard(job, now)),
    }));
  });

  /** Un relâchement de glisser-déposer ne doit pas ouvrir la fiche sous le pointeur. */
  private _justDragged = false;

  protected drop(event: CdkDragDrop<JobStatus, JobStatus, JobTrack>): void {
    if (event.container === event.previousContainer) return;
    this.move(event.item.data, event.container.data);
  }

  protected changeStatus(job: JobTrack, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as JobStatus;
    this.move(job, status);
    // La carte change de colonne, donc son menu est recréé : on lui rend le focus.
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLSelectElement>(`#board-status-${job.id}`)
          ?.focus(),
      { injector: this.injector },
    );
  }

  protected markDragged(): void {
    this._justDragged = true;
  }

  protected clearDragged(): void {
    this._justDragged = false;
  }

  protected open(event: MouseEvent, id: string): void {
    if (this._justDragged) {
      event.preventDefault();
      this._justDragged = false;
      return;
    }
    // Ctrl/Cmd/Maj-clic ou clic milieu : comportement natif du lien (nouvel onglet)
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.router.navigate(['/dashboard/jobtrack', id]);
  }

  private move(job: JobTrack, status: JobStatus): void {
    if (job.status === status) return;
    this.jobs.update((jobs) => moveJob(jobs, job.id, status));
    this.gateway
      .updateWithReminder(job.id, statusChangePayload(job, status, new Date()), false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.jobs.update((jobs) => replaceJob(jobs, saved));
          this.toast.success('Statut mis à jour', `« ${job.title} » : ${COLUMN_TITLES[status]}`);
        },
        error: () => {
          this.jobs.update((jobs) => replaceJob(jobs, job));
          this.toast.danger(
            'Statut non modifié',
            `« ${job.title} » n'a pas pu être déplacée, elle a repris sa place.`,
          );
        },
      });
  }
}

function toCard(job: JobTrack, now: Date): BoardCard {
  const sentAt = job.status === 'TO_APPLY' ? null : job.appliedAt;
  const dateIso = sentAt ?? job.createdAt;
  const prefix = sentAt ? 'Envoyée' : 'Ajoutée';
  return {
    id: job.id,
    job,
    title: job.title,
    company: job.company ?? null,
    contract: job.contractType ? CONTRACT_TYPE_CONFIG[job.contractType] : null,
    dateIso,
    dateLabel: `${prefix} ${relativeDate(dateIso, now)}`,
  };
}
