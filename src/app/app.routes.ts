import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('@features/dashboard/route/dashboard.routes').then((m) => m.dashboardRoutes),
  },
  {
    path: 'auth',
    loadChildren: () => import('@features/auth/route/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
