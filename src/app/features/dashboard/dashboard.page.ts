import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LayoutComponent } from '@shared/ui/layout/layout';
import { ButtonComponent } from '@shared/ui/button/button';
import { ListJobtracksUseCase } from '@features/jobtrack/domain/use-cases/list-jobtracks.use-case';
import type { JobTrack } from '@features/jobtrack/domain/models/jobtrack.model';
import { JobtrackList } from '@features/jobtrack/application/components/jobtrack-list/jobtrack-list';
import type { DashboardStats } from '@features/dashboard/components/dashboard-stats/model/dashboard-stats';
import { IconComponent } from '@shared/ui/icon/icon';
import { ReminderCheckerService } from '@features/jobtrack/application/reminder-checker.service';

@Component({
  selector: 'app-dashboard',
  imports: [LayoutComponent, ButtonComponent, JobtrackList, IconComponent],
  template: `
    <app-layout>
      <div class="relative overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"
        ></div>
        <div class="relative">
          <!-- Header Navigation Bar -->
          <nav aria-label="Navigation du dashboard" class="backdrop-blur-sm bg-background/95 border-b border-border/50">
            <div class="container mx-auto px-1 sm:px-6 lg:px-8">
              <div class="flex items-center justify-between h-14 sm:h-20">
                <div class="flex items-center gap-3">
                  <div class="relative">
                    <div class="absolute inset-0 bg-primary/20 rounded-xl blur"></div>
                    <div class="relative p-2 bg-primary/10 rounded-xl">
                      <app-icon name="lucide-bar-chart-3" cssClass="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                  </div>
                  <div>
                    <h1 class="text-xl font-bold text-text sm:text-2xl">CandidDash</h1>
                    <p class="text-xs text-muted sm:text-sm">Dashboard de candidatures</p>
                  </div>
                </div>

                <div class="flex items-center gap-2 sm:gap-3">
                  <app-button
                    [customClass]="
                      '!w-auto inline-flex items-center justify-center !p-2 !rounded-xl !shadow-md !text-sm sm:!px-5 sm:!py-2.5 sm:!rounded-lg sm:!shadow-lg'
                    "
                    color="primary"
                    (buttonClick)="goToCreate()"
                  >
                    <app-icon name="lucide-plus" cssClass="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                    <span class="hidden sm:inline">Ajoute une annonce</span>
                  </app-button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
      <section aria-label="Liste des candidatures" class="container mx-auto px-0 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        <app-jobtrack-list />
      </section>
    </app-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  private readonly listJobtracksUseCase = inject(ListJobtracksUseCase);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reminderChecker = inject(ReminderCheckerService);

  readonly stats = signal<DashboardStats>({
    total: 0,
    applied: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    rejected: 0,
  });

  constructor() {
    this.reminderChecker.start(this.destroyRef);
    this.refresh();
  }

  private refresh(): void {
    this.listJobtracksUseCase.execute().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.updateStats(items);
      },
      error: () => {},
    });
  }

  private updateStats(jobs: JobTrack[]): void {
    this.stats.set({
      total: jobs.length,
      applied: jobs.filter((j) => j.status === 'APPLIED').length,
      pending: jobs.filter((j) => j.status === 'PENDING').length,
      interview: jobs.filter((j) => j.status === 'INTERVIEW').length,
      accepted: jobs.filter((j) => j.status === 'ACCEPTED').length,
      rejected: jobs.filter((j) => j.status === 'REJECTED').length,
    });
  }

  goToCreate(): void {
    this.router.navigate(['/dashboard/jobtrack/new']);
  }
}
