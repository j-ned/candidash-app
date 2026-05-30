import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Pages publiques statiques : prérendues au build (SEO/LCP).
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'terms-of-service', renderMode: RenderMode.Prerender },
  { path: 'features', renderMode: RenderMode.Prerender },
  // Routes gardées + dynamiques (auth, dashboard) : rendu client (CSR).
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'dashboard/**', renderMode: RenderMode.Client },
  { path: 'auth', renderMode: RenderMode.Client },
  { path: 'auth/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
