import { Component, computed, input } from '@angular/core';
import { Icon } from '@shared/ui/icon/icon';
import type { DocumentKind } from '../../domain/models/document.model';
import { documentChecks, type CheckCategory } from '../../domain/analysis/document-checks';
import { keywordCoverage, offerKeywords } from '../../domain/analysis/offer-keywords';

const CATEGORY_TITLES: Record<CheckCategory, string> = {
  structure: 'Structure',
  ats: 'Lecture par les logiciels de tri (ATS)',
};

const CATEGORIES: readonly CheckCategory[] = ['structure', 'ats'];

/**
 * Analyse déterministe du document, sans IA et sans rien envoyer : structure attendue,
 * lisibilité par les ATS et mots-clés de l'offre de la candidature liée.
 */
@Component({
  selector: 'app-document-analysis',
  imports: [Icon],
  host: { class: 'block space-y-6' },
  template: `
    <section aria-labelledby="analysis-offer-title" class="space-y-3">
      <h3 id="analysis-offer-title" class="font-semibold text-text">Mots-clés de l'offre</h3>
      @if (coverage(); as result) {
        <p data-testid="analysis-score" class="text-sm text-text">
          <strong>{{ result.present.length }} mots-clés sur {{ keywords().length }}</strong>
          ({{ result.score }} %)
        </p>
        @if (result.missing.length) {
          <div class="space-y-1.5">
            <p class="text-sm text-muted">
              Absents du document : ajoutez ceux que vous maîtrisez, avec les mots de l'offre.
            </p>
            <ul data-testid="analysis-missing" class="flex flex-wrap gap-2">
              @for (keyword of result.missing; track keyword) {
                <li
                  class="rounded-full border border-warning/50 bg-warning/10 px-2.5 py-0.5 text-sm text-text"
                >
                  {{ keyword }}
                </li>
              }
            </ul>
          </div>
        }
        @if (result.present.length) {
          <div class="space-y-1.5">
            <p class="text-sm text-muted">Déjà présents :</p>
            <ul data-testid="analysis-present" class="flex flex-wrap gap-2">
              @for (keyword of result.present; track keyword) {
                <li
                  class="rounded-full border border-success/50 bg-success/10 px-2.5 py-0.5 text-sm text-text"
                >
                  {{ keyword }}
                </li>
              }
            </ul>
          </div>
        }
      } @else {
        <p data-testid="analysis-no-offer" class="text-sm text-muted">
          @if (jobLabel(); as job) {
            La candidature « {{ job }} » n'a pas encore de texte d'offre : collez-le dans sa fiche
            pour comparer le document à l'offre.
          } @else {
            Liez ce document à une candidature dont le texte de l'offre est renseigné pour le
            comparer à l'offre.
          }
        </p>
      }
    </section>

    @for (group of groups(); track group.category) {
      <section [attr.aria-labelledby]="'analysis-' + group.category" class="space-y-2">
        <h3 [id]="'analysis-' + group.category" class="font-semibold text-text">
          {{ group.title }}
        </h3>
        <ul class="space-y-2">
          @for (check of group.checks; track check.id) {
            <li data-testid="analysis-check" [attr.data-ok]="check.ok" class="flex gap-2 text-sm">
              <app-icon
                [name]="check.ok ? 'lucide-circle-check' : 'lucide-triangle-alert'"
                [cssClass]="
                  'mt-0.5 h-4 w-4 shrink-0 ' + (check.ok ? 'text-success' : 'text-warning')
                "
              />
              <div>
                <span class="text-text">
                  {{ check.title }}
                  <span class="sr-only">{{ check.ok ? ' : correct' : ' : à revoir' }}</span>
                </span>
                @if (!check.ok) {
                  <p class="text-muted">{{ check.tip }}</p>
                }
              </div>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class DocumentAnalysis {
  readonly kind = input.required<DocumentKind>();
  readonly markdown = input.required<string>();
  /** Texte de l'offre de la candidature liée, s'il est renseigné. */
  readonly offerText = input<string | null>(null);
  /** Intitulé de la candidature liée, pour guider quand son offre manque. */
  readonly jobLabel = input<string | null>(null);

  protected readonly keywords = computed(() => offerKeywords(this.offerText() ?? ''));
  protected readonly coverage = computed(() =>
    this.keywords().length ? keywordCoverage(this.keywords(), this.markdown()) : null,
  );
  protected readonly groups = computed(() => {
    const checks = documentChecks(this.kind(), this.markdown());
    return CATEGORIES.map((category) => ({
      category,
      title: CATEGORY_TITLES[category],
      checks: checks.filter((check) => check.category === category),
    })).filter((group) => group.checks.length > 0);
  });
}
