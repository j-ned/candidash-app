import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import { Toaster } from '@shared/ui/toast/service/toast';
import type { JobTrack } from '@features/jobtrack/domain/models/jobtrack.model';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';

const CHECK_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class ReminderChecker {
  private readonly toast = inject(Toaster);
  private readonly jobtrackGateway = inject(JobtrackGateway);

  private started = false;
  private readonly notifiedIds = new Set<string>();

  start(destroyRef: DestroyRef): void {
    if (this.started) return;
    this.started = true;

    interval(CHECK_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.jobtrackGateway.list()),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe({
        next: (jobs) => this.notifyOverdue(jobs),
        error: () => {},
      });
  }

  private readonly TERMINAL_STATUSES: ReadonlySet<string> = new Set(['ACCEPTED', 'REJECTED']);

  private notifyOverdue(jobs: JobTrack[]): void {
    const overdue = jobs.filter(
      (job) =>
        !this.TERMINAL_STATUSES.has(job.status) &&
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
