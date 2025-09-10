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
    path: 'settings',
    loadComponent: () => import('../settings/settings.page').then((m) => m.SettingsPageComponent),
  },
];
