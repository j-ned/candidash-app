import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SPRITE_VERSION } from './sprite-version';

@Component({
  selector: 'app-icon',
  template: `
    <svg [class]="cssClass()" [attr.aria-hidden]="ariaHidden()" [attr.aria-label]="ariaLabel()">
      <use [attr.href]="href()" />
    </svg>
  `,
  host: { class: 'inline-flex shrink-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<string>();
  readonly cssClass = input<string>('w-5 h-5');
  readonly ariaHidden = input<string>('true');
  readonly ariaLabel = input<string | undefined>(undefined);

  // Empreinte du sprite dans l'URL : le fichier est servi en cache immuable
  protected readonly href = computed(() => `/icons/sprite.svg?v=${SPRITE_VERSION}#${this.name()}`);
}
