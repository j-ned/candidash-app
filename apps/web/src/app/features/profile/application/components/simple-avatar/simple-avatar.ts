import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-16 h-16 text-xl',
};

const BASE_CLASSES =
  'bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold border-2 border-primary/20 select-none';

@Component({
  selector: 'app-simple-avatar',
  templateUrl: './simple-avatar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleAvatar {
  readonly username = input('');
  readonly size = input<AvatarSize>('md');

  protected readonly initials = computed(() => {
    const username = this.username().trim();
    if (!username) return '?';

    const names = username.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (
      names[0].charAt(0) + names[names.length - 1].charAt(0)
    ).toUpperCase();
  });

  protected readonly avatarClasses = computed(
    () => `${SIZE_CLASSES[this.size()]} ${BASE_CLASSES}`,
  );
}
