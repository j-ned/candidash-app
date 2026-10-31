import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/admin';
import { unsavedChangesGuard } from '@features/documents/application/unsaved-changes-guard';

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
    path: 'documents',
    title: 'Mes documents — Candidash',
    loadComponent: () =>
      import('@features/documents/pages/documents/documents').then((m) => m.Documents),
  },
  {
    path: 'documents/:id',
    title: 'Éditeur de document — Candidash',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('@features/documents/pages/document-editor/document-editor').then(
        (m) => m.DocumentEditor,
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
