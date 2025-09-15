import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-simple-avatar',
  templateUrl: './simple-avatar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleAvatar {
  @Input() username = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  getInitials(): string {
    if (!this.username) return '?';

    const names = this.username.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }

    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  getAvatarClasses(): string {
    const sizeClasses = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-12 h-12 text-lg',
      lg: 'w-16 h-16 text-xl',
    };

    return `
      ${sizeClasses[this.size]}
      bg-primary/10
      text-primary
      rounded-full
      flex
      items-center
      justify-center
      font-semibold
      border-2
      border-primary/20
      select-none
    `
      .replace(/\s+/g, ' ')
      .trim();
  }
}
