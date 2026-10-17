import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/admin';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('@features/profile/application/profile-layout').then((m) => m.ProfileLayout),
  },
  {
    path: 'admin',
    title: 'Administration — Candidash',
    canMatch: [adminGuard],
    loadComponent: () => import('@features/admin/pages/admin/admin').then((m) => m.Admin),
  },
  {
    path: 'jobtrack',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'jobtrack/new',
    loadComponent: () =>
      import('@features/jobtrack/application/components/jobtrack-form/jobtrack-form').then(
        (m) => m.JobtrackFormPage,
      ),
  },
  {
    path: 'jobtrack/:id',
    loadComponent: () =>
      import('@features/jobtrack/application/components/jobtrack-detail/jobtrack-detail').then(
        (m) => m.JobtrackDetail,
      ),
  },
  {
    path: 'jobtrack/:id/edit',
    loadComponent: () =>
      import('@features/jobtrack/application/components/jobtrack-form/jobtrack-form').then(
        (m) => m.JobtrackFormPage,
      ),
  },
];
