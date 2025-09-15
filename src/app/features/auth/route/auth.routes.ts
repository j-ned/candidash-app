import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'signin',
    loadComponent: () => import('../auth-layout').then((m) => m.AuthLayout),
  },
  {
    path: 'signup',
    loadComponent: () => import('../auth-layout').then((m) => m.AuthLayout),
  },
  {
    path: 'verification',
    loadComponent: () =>
      import('../components/verification/verification').then((m) => m.Verification),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('../components/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: '',
    redirectTo: 'signin',
    pathMatch: 'full',
  },
];
