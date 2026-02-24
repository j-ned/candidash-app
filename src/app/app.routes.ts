import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/guards/auth';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'dashboard',
    canMatch: [authGuard],
    loadChildren: () =>
      import('@features/dashboard/route/dashboard.routes').then((m) => m.dashboardRoutes),
  },
  {
    path: 'auth',
    canMatch: [guestGuard],
    loadChildren: () => import('@features/auth/route/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'terms-of-service',
    loadComponent: () => import('./features/legal/terms-of-service/terms-of-service').then((m) => m.TermsOfService),
  },
  {
    path: 'features',
    loadComponent: () => import('./features/legal/features/features').then((m) => m.Features),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
