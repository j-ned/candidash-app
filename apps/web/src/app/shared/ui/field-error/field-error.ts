import { Component, input } from '@angular/core';
import type { ReadonlyFieldTree } from '@angular/forms/signals';

/** Première erreur d'un champ touché ; le message vit dans le schéma du formulaire. */
@Component({
  selector: 'app-field-error',
  host: { class: 'contents' },
  template: `
    @let state = field()();
    @if (state.touched() && state.invalid()) {
      <p
        [id]="errorId()"
        [attr.data-testid]="testId() ?? null"
        role="alert"
        class="text-error text-xs mt-1 sm:text-sm"
      >
        {{ state.errors()[0]?.message }}
      </p>
    }
  `,
})
export class FieldError {
  readonly field = input.required<ReadonlyFieldTree<unknown>>();
  readonly errorId = input.required<string>();
  readonly testId = input<string>();
}
