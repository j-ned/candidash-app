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
    path: '',
    redirectTo: 'signin',
    pathMatch: 'full',
  },
];
