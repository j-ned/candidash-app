import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutComponent } from '@shared/ui/layout/layout';
import { ButtonComponent } from '@shared/ui/button/button';
import { JobTrackService } from '../jobs/services/jobtrack.service';
import type { JobTrack } from '../jobs/models/jobtrack.types';
import { JobTrackListComponent } from '../jobs/components/jobtrack-list.component';
import { type DashboardStats } from './components/dashboard-stats.component';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [LayoutComponent, ButtonComponent, JobTrackListComponent, NgOptimizedImage],
  template: `
    <app-layout>
      <div class="relative overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"
        ></div>
        <div class="relative">
          <!-- Header Navigation Bar -->
          <div class="backdrop-blur-sm bg-background/95 border-b border-border/50">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
              <div class="flex items-center justify-between h-16 sm:h-20">
                <div class="flex items-center gap-3">
                  <div class="relative">
                    <div class="absolute inset-0 bg-primary/20 rounded-xl blur"></div>
                    <div class="relative p-2 bg-primary/10 rounded-xl">
                      <img
                        [ngSrc]="'/icons/chart.svg'"
                        alt="Logo"
                        class="w-8 h-8 sm:w-10 sm:h-10 icon-invert"
                        width="32"
                        height="32"
                      />
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
                      'inline-flex items-center px-4 py-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all sm:px-6 sm:py-2.5'
                    "
                    color="primary"
                    (buttonClick)="goToCreate()"
                  >
                    <img
                      [ngSrc]="'/icons/add.svg'"
                      alt="Ajouter"
                      class="w-4 h-4 mr-1.5 sm:w-5 sm:h-5 sm:mr-2 icon-invert"
                      width="16"
                      height="16"
                    />

                    <span class="hidden sm:inline">Ajoute une annonce</span>
                  </app-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        <app-jobtrack-list />
      </div>
    </app-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  private readonly service = inject(JobTrackService);
  private readonly router = inject(Router);

  readonly stats = signal<DashboardStats>({
    total: 0,
    applied: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    rejected: 0,
  });

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.service.list().subscribe({
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

  goToAnalytics(): void {
    // Pour l'instant, on reste sur le dashboard
    // Plus tard : this.router.navigate(['/dashboard/analytics']);
  }
}
