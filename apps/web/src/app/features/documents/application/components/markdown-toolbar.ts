import { Component, ElementRef, computed, input, signal, viewChildren } from '@angular/core';
import { Icon } from '@shared/ui/icon/icon';
import type { BlockLevel } from '../markdown-edit';
import { TOOLBAR_TOOLS, toolbarToolOf } from '../markdown-toolbar-controls';
import { nextToolbarIndex } from '../toolbar-focus';
import type { MarkdownEditor } from './markdown-editor';

const BLOCK_LEVELS: readonly BlockLevel[] = ['paragraph', 'h2', 'h3', 'h4'];

// Barre d'outils reprise de l'éditeur d'articles du portfolio, sans le panneau d'image :
// un CV lu par un ATS se passe d'images.
@Component({
  selector: 'app-markdown-toolbar',
  imports: [Icon],
  host: {
    class: 'block',
    '(keydown)': 'moveFocus($event)',
    '(focusin)': 'rememberFocus($event)',
  },
  template: `
    <div
      role="toolbar"
      data-testid="markdown-toolbar"
      aria-label="Mise en forme du document"
      [attr.aria-controls]="zoneId()"
      class="mb-2 flex flex-wrap items-center gap-1 border-b border-border pb-1.5"
    >
      <select
        #control
        data-testid="markdown-block-level"
        aria-label="Niveau du texte"
        class="h-11 rounded-md border border-input bg-background px-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
        [tabIndex]="tabIndexes()[0]"
        [value]="blockLevel()"
        (change)="chooseLevel($event)"
      >
        <option value="paragraph">Paragraphe</option>
        <option value="h2">Titre 2</option>
        <option value="h3">Titre 3</option>
        <option value="h4">Titre 4</option>
        <option value="" disabled>Autre titre</option>
      </select>
      <span aria-hidden="true" class="mx-1 h-6 w-px bg-border"></span>
      @for (tool of tools; track tool.id; let index = $index) {
        <button
          #control
          type="button"
          [attr.data-testid]="'markdown-tool-' + tool.id"
          [attr.aria-label]="tool.label"
          [attr.aria-keyshortcuts]="tool.shortcut"
          [tabIndex]="tabIndexes()[index + 1]"
          class="inline-grid size-11 place-items-center rounded-md text-text hover:bg-surface-200 focus-visible:outline-2 focus-visible:outline-primary"
          (click)="editor().apply(tool.action)"
        >
          <app-icon [name]="tool.icon" cssClass="h-4 w-4" />
        </button>
      }
    </div>
    <p role="status" data-testid="markdown-toolbar-status" class="sr-only">
      @for (message of announcement(); track message) {
        <span>{{ message.text }}</span>
      }
    </p>
  `,
})
export class MarkdownToolbar {
  readonly editor = input.required<MarkdownEditor>();

  private readonly _controls = viewChildren<ElementRef<HTMLElement>>('control');

  protected readonly tools = TOOLBAR_TOOLS.map((tool) => ({
    ...tool,
    shortcut: tool.key && shortcutLabel(tool.key),
  }));
  protected readonly activeIndex = signal(0);
  // Focus itinérant : seul le contrôle actif (le select en 0, puis les outils) entre dans l'ordre Tab.
  protected readonly tabIndexes = computed(() =>
    [null, ...this.tools].map((_, index) => (index === this.activeIndex() ? 0 : -1)),
  );
  protected readonly zoneId = computed(() => this.editor().zoneId);
  protected readonly blockLevel = computed(() => this.editor().blockLevel() ?? '');
  // Un nouvel objet à chaque action recrée le nœud : la même phrase est annoncée de nouveau.
  protected readonly announcement = computed(() => {
    const applied = this.editor().applied();
    const tool = applied && toolbarToolOf(applied.action);
    return tool ? [{ text: applied.removed ? tool.removed : tool.applied }] : [];
  });

  protected chooseLevel(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    const level = BLOCK_LEVELS.find((candidate) => candidate === select.value);
    if (!level) return;
    this.editor().apply({ kind: 'block-level', level });
    // Haut et Bas changent la valeur d'un select fermé : il garde le focus pour la suite.
    select.focus();
  }

  protected moveFocus(event: KeyboardEvent): void {
    const controls = this._controls().map(({ nativeElement }) => nativeElement);
    const current = controls.findIndex((control) => control === event.target);
    if (current < 0) return;
    const next = nextToolbarIndex(current, event.key, controls.length);
    if (next === null) return;
    event.preventDefault();
    controls[next].focus();
  }

  protected rememberFocus(event: FocusEvent): void {
    const index = this._controls().findIndex(({ nativeElement }) => nativeElement === event.target);
    if (index >= 0) this.activeIndex.set(index);
  }
}

function shortcutLabel(key: string): string {
  const letter = key.toUpperCase();
  return `Control+${letter} Meta+${letter}`;
}
