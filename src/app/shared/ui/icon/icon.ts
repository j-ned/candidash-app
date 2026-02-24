import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  template: `
    <svg [class]="cssClass()" [attr.aria-hidden]="ariaHidden()" [attr.aria-label]="ariaLabel()">
      <use [attr.href]="'/icons/sprite.svg#' + name()" />
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
}
