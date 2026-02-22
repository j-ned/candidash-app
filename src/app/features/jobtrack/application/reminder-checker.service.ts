import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, switchMap } from 'rxjs';
import { ListJobtracksUseCase } from '@features/jobtrack/domain/use-cases/list-jobtracks.use-case';
import { ToastService } from '@shared/ui/toast/service/toast';
import type { JobTrack } from '@features/jobtrack/domain/models/jobtrack.model';

const CHECK_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class ReminderCheckerService {
  private readonly listJobtracksUseCase = inject(ListJobtracksUseCase);
  private readonly toast = inject(ToastService);

  private started = false;
  private readonly notifiedIds = new Set<string>();

  start(destroyRef: DestroyRef): void {
    if (this.started) return;
    this.started = true;

    // Check immediately, then every 60s
    this.check();

    interval(CHECK_INTERVAL_MS)
      .pipe(
        switchMap(() => this.listJobtracksUseCase.execute()),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe({
        next: (jobs) => this.notifyOverdue(jobs),
        error: () => {},
      });
  }

  private check(): void {
    this.listJobtracksUseCase.execute().subscribe({
      next: (jobs) => this.notifyOverdue(jobs),
      error: () => {},
    });
  }

  private notifyOverdue(jobs: JobTrack[]): void {
    const overdue = jobs.filter(
      (job) =>
        job.reminder?.isActive &&
        new Date(job.reminder.nextReminderAt) < new Date(),
    );

    for (const job of overdue) {
      if (this.notifiedIds.has(job.id)) continue;
      this.notifiedIds.add(job.id);

      const label = job.company ? `${job.title} chez ${job.company}` : job.title;
      this.toast.warning('Rappel de suivi', `Relancez votre candidature : ${label}`);
    }
  }
}
