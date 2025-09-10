import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [CommonModule, NgOptimizedImage],
  template: `
    <button
      [type]="type()"
      [class]="buttonClasses()"
      [disabled]="disabled()"
      (click)="buttonClick.emit($event)"
    >
      @if (isLoading()) {
        <span class="mr-2 inline-block">
          <img
            [ngSrc]="iconSpinner()"
            class="h-4 w-4 text-text icon-invert animate-spin"
            alt="Loading"
            height="24"
            width="24"
          />
        </span>
      }
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly buttonClick = output<MouseEvent>();
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly color = input<'primary' | 'secondary' | 'accent' | 'red'>('primary');
  readonly disabled = input<boolean>(false);
  readonly noRounded = input<boolean>(false);
  readonly rounded = input<boolean>(true);
  readonly customClass = input<string>('');
  readonly isLoading = input<boolean>(false);

  readonly iconSpinner = signal('icons/spinner.svg');

  readonly buttonClasses = computed(() => {
    const classes = [
      'w-full',
      'px-4',
      'py-3',
      'text-base',
      'font-semibold',
      'tracking-wide',
      'focus:outline-none',
      'transition-all',
      'duration-300',
      'ease-in-out',
      'transform',
      'hover:scale-105',
      'active:scale-95',
      'shadow-lg',
      'hover:shadow-xl',
      'active:shadow-md',
    ];

    const color = this.color();
    if (color === 'primary') {
      classes.push(
        'bg-primary',
        'hover:bg-primary/80',
        'focus:bg-primary/70',
        'active:bg-primary/90',
        'text-text',
      );
    } else if (color === 'secondary') {
      classes.push(
        'bg-secondary',
        'hover:bg-secondary/80',
        'focus:bg-secondary/70',
        'active:bg-secondary/90',
        'text-text',
      );
    } else if (color === 'accent') {
      classes.push(
        'bg-accent',
        'hover:bg-accent/80',
        'focus:bg-accent/70',
        'active:bg-accent/90',
        'text-text',
      );
    } else if (color === 'red') {
      classes.push(
        'bg-error',
        'hover:bg-error/80',
        'focus:bg-error/70',
        'active:bg-error/90',
        'text-text',
      );
    }

    if (this.rounded()) {
      classes.push('rounded-lg');
    }
    if (this.noRounded()) {
      classes.push('rounded-none');
    }
    if (this.customClass()) {
      classes.push(this.customClass());
    }
    if (this.disabled()) {
      classes.push('opacity-50', 'cursor-not-allowed');
    }

    return classes.join(' ');
  });
}
