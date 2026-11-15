import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/guards/auth';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    data: {
      description:
        "Garde une offre en un clic, suis chaque candidature sur ton tableau, reçois un rappel quand il est temps de relancer et ajuste ton CV aux mots-clés de l'offre.",
    },
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
    title: "Conditions d'utilisation — Candidash",
    data: {
      description:
        "Conditions d'utilisation de Candidash : compte utilisateur, description du service, cookies d'authentification, mesure d'audience et protection des données.",
    },
    loadComponent: () =>
      import('./features/legal/terms-of-service/terms-of-service').then((m) => m.TermsOfService),
  },
  {
    path: 'extension-privacy',
    title: "Confidentialité de l'extension — Candidash",
    data: {
      description:
        "Ce que l'extension Candidash pour Chrome et Firefox traite, ce qu'elle ne fait pas, la conservation des données et vos droits au titre du RGPD.",
    },
    loadComponent: () =>
      import('./features/legal/extension-privacy/extension-privacy').then(
        (m) => m.ExtensionPrivacy,
      ),
  },
  {
    path: 'contact',
    title: 'Contact — Candidash',
    data: {
      description:
        "Une question sur Candidash ou sur l'extension navigateur ? Écrivez-nous, la réponse arrive par e-mail.",
    },
    loadComponent: () => import('./features/contact/pages/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'features',
    title: 'Fonctionnalités — Candidash',
    data: {
      description:
        "Une minute dans l'application réelle : tableau de bord, candidatures en cinq colonnes, analyse du CV face à l'offre et export en PDF.",
    },
    loadComponent: () => import('./features/legal/features/features').then((m) => m.Features),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
