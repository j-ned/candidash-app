import { WritableSignal } from '@angular/core';

export function startCooldownTimer(
  cooldownSignal: WritableSignal<number>,
  durationSeconds: number = 60,
): ReturnType<typeof setInterval> {
  cooldownSignal.set(durationSeconds);

  return setInterval(() => {
    const current = cooldownSignal();
    if (current <= 1) {
      cooldownSignal.set(0);
    } else {
      cooldownSignal.set(current - 1);
    }
  }, 1000);
}

export function clearCooldownTimer(intervalId: ReturnType<typeof setInterval> | null): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
}
