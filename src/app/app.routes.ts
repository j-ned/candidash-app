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
    loadComponent: () =>
      import('./features/legal/terms-of-service/terms-of-service').then((m) => m.TermsOfService),
  },
  {
    path: 'extension-privacy',
    title: "Confidentialité de l'extension — Candidash",
    loadComponent: () =>
      import('./features/legal/extension-privacy/extension-privacy').then(
        (m) => m.ExtensionPrivacy,
      ),
  },
  {
    path: 'contact',
    title: 'Contact — Candidash',
    loadComponent: () => import('./features/contact/pages/contact/contact').then((m) => m.Contact),
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
