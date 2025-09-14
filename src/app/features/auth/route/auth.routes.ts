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
    loadComponent: () => import('../components/verification').then((m) => m.VerificationComponent),
  },
  {
    path: '',
    redirectTo: 'signin',
    pathMatch: 'full',
  },
];
