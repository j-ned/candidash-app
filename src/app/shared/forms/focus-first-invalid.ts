import type { ReadonlyFieldTree } from '@angular/forms/signals';

/** Après un submit refusé : focus sur le premier champ en erreur (le bouton reste actif). */
export function focusFirstInvalid(field: ReadonlyFieldTree<unknown>): void {
  field().errorSummary()[0]?.fieldTree().focusBoundControl();
}
