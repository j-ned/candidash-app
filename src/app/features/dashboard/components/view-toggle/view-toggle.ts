import { Component, model } from '@angular/core';
import { Icon } from '@shared/ui/icon/icon';
import type { DashboardView } from '../../view-preference';

const OPTIONS: readonly { view: DashboardView; label: string; icon: string }[] = [
  { view: 'list', label: 'Liste', icon: 'lucide-list' },
  { view: 'board', label: 'Tableau', icon: 'lucide-columns-3' },
];

/** Bascule liste / tableau Kanban : boutons à état (`aria-pressed`), choix remonté au parent. */
@Component({
  selector: 'app-view-toggle',
  imports: [Icon],
  host: {
    role: 'group',
    'aria-label': 'Affichage des candidatures',
    class: 'inline-flex rounded-lg border border-border bg-card p-1',
  },
  template: `
    @for (option of options; track option.view) {
      <button
        type="button"
        [attr.data-testid]="'view-' + option.view"
        [attr.aria-pressed]="view() === option.view"
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        [class]="
          view() === option.view ? 'bg-primary text-on-primary' : 'text-muted hover:text-text'
        "
        (click)="view.set(option.view)"
      >
        <app-icon [name]="option.icon" cssClass="w-4 h-4" />
        {{ option.label }}
      </button>
    }
  `,
})
export class ViewToggle {
  readonly view = model.required<DashboardView>();

  protected readonly options = OPTIONS;
}
