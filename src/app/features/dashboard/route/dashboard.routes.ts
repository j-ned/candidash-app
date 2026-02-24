import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('@features/profile/application/profile-layout').then(
        (m) => m.ProfileLayout,
      ),
  },
  {
    path: 'jobtrack',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'jobtrack/new',
    loadComponent: () =>
      import(
        '@features/jobtrack/application/components/jobtrack-form/jobtrack-form'
      ).then((m) => m.JobtrackFormPage),
  },
  {
    path: 'jobtrack/:id',
    loadComponent: () =>
      import(
        '@features/jobtrack/application/components/jobtrack-detail/jobtrack-detail'
      ).then((m) => m.JobtrackDetail),
  },
  {
    path: 'jobtrack/:id/edit',
    loadComponent: () =>
      import(
        '@features/jobtrack/application/components/jobtrack-form/jobtrack-form'
      ).then((m) => m.JobtrackFormPage),
  },
];
