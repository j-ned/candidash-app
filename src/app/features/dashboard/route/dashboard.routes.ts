import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../dashboard.page').then((m) => m.DashboardPageComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('../profile/profile-layout').then((m) => m.ProfileLayoutComponent),
  },
  {
    path: 'jobtrack',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'jobtrack/new',
    loadComponent: () =>
      import('../../jobs/components/jobtrack-form/jobtrack-form').then(
        (m) => m.JobTrackFormPageComponent,
      ),
  },
  {
    path: 'jobtrack/:id/edit',
    loadComponent: () =>
      import('../../jobs/components/jobtrack-form/jobtrack-form').then(
        (m) => m.JobTrackFormPageComponent,
      ),
  },
];
