# Guide de style et bonnes pratiques Angular 20+

## Objectif

Fournir une référence moderne, claire et générique pour structurer, coder, tester et livrer des applications Angular 20+.

## Outils et commandes (à adapter selon votre gestionnaire de paquets)

### Démarrer le serveur de dev
- **Vite**: `pnpm dev` / `npm run dev`
- **CLI Angular**: `ng serve`

### Build
- **Build production**: `pnpm build`
- **Build watch**: `pnpm watch`

### Tests unitaires
- **Tests**: `pnpm test` (Vitest recommandé avec `@analogjs/vitest-angular`)
- **Fichiers de test**: `*.spec.ts`
- **Setup global**: `src/test-setup.ts`

### Qualité de code
- **Lint**: `pnpm lint`
- **Lint + fix**: `pnpm lint:fix`
- **Format**: `pnpm prettier`
- **Vérifier le format**: `pnpm prettier:check`

**Recommandé**: hooks pré-commit (Husky + lint-staged) pour lancer lint, prettier:check et typecheck (`tsc --noEmit`).

## Architecture et structure

### Technologies
- **Framework**: Angular 20+
- **Dev server/build**: Vite (via `@analogjs/vite-plugin-angular`) recommandé
- **Tests**: Vitest (+ `@analogjs/vitest-angular`)
- **Styles**: TailwindCSS possible; PostCSS recommandé
- **TypeScript**: configuration stricte (`"strict": true`)

### Structure de projet

- **`core/`**: services transverses (auth, http, thème), guards, interceptors, utils, configuration d'app.
- **`features/`**: fonctionnalités verticales (domaines métier) avec composants/pages, routes et services spécifiques.
- **`shared/`**: UI réutilisable (composants, directives, pipes), helpers UI, et un emplacement unique pour modèles/interfaces partagés (ex. `shared/models`).

**Règle**: un seul emplacement pour interfaces/models afin d'éviter les duplications.

**Barrels** (`index.ts`): autorisés avec parcimonie; éviter les cycles.

### Conventions de nommage (officielles Angular) - (Plus de suffixes type - Trouver des noms adapter pour fichiers et les ranger dans des dossiers adéquat)
- **Composants**: `feature-name.ts`
- **Services**: `feature-name.ts`
- **Guards**: `feature-name.ts`
- **Directives**: `feature-name.ts`
- **Pipes**: `feature-name.ts`
- **Modèles/Types**: `feature-name.ts` (ou `.types.ts`)
- **Tests**: `feature-name.component.ts` (selon l'artefact)

Fichiers en **kebab-case**; classes en **PascalCase**.

## Philosophie moderne (Angular 20+)

### Architecture standalone
- Tous les composants/directives/pipes sont **standalone** par default.
- Ne pas déclarez explicitement `standalone: true` dans le décorateur car il est par default donc inutile de le déclarer.
- Les NgModules ne sont plus nécessaires pour organiser le code.

### Réactivité par signaux
- `signal()` pour l'état local, `computed()` pour l'état dérivé, `effect()` pour les effets.
- `set()` et `update()` par défaut; `mutate()` uniquement si un gain de performance est justifié (documenter la décision).

### Templates déclaratifs
- Utiliser le nouveau contrôle de flux: `@if`, `@for`, `@switch` (toujours fournir `track` dans `@for`).
- Préférer les bindings natifs `[class.xxx]` et `[style.xxx]`; utiliser `ngClass`/`ngStyle` quand plusieurs classes/styles dynamiques sont nécessaires.

### Injection de dépendances (DI)
- `inject()` privilégié dans services, guards, interceptors, factories et fonctions.
- Injection par constructeur autorisée et lisible dans les composants/directives.
- Services globaux: `providedIn: 'root'`.

## Composants

### Bonnes pratiques
- **Responsabilité unique**; découpage par fonctionnalités.
- Toujours `changeDetection: ChangeDetectionStrategy.OnPush`.
- **Inputs/Outputs**: préférer `input()` et `output()` aux décorateurs classiques.
- **Two-way binding**: `model()` si pertinent.
- **Host bindings/listeners**: utiliser la clé `host` du décorateur `@Component`.
- **Images statiques**: utiliser `NgOptimizedImage` avec `width`/`height` explicites (ou `fill`).

### Exemple

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  model,
} from '@angular/core';

@Component({
  selector: 'feature-widget',
  standalone: true,
  template: `
    @if (visible()) {
      <div [class.active]="active()" [style.color]="color()">
        {{ title() }}
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-busy]': 'loading()',
  },
})
export class FeatureWidget {
  title = input.required<string>();
  visible = model<boolean>(true);
  active = input(false);
  color = input<string>('inherit');
  loading = input(false);
  toggled = output<boolean>();
}
```

## Gestion de l'état

- Utiliser des **signaux** pour l'UI et l'état local/partagé via services.
- Conserver les **Observables** aux frontières (HttpClient, WebSocket); convertir via `toSignal()` si utile.
- **Immutabilité** par défaut avec `set`/`update`; `mutate` rare et justifié.

## Routage

### Stratégies de lazy loading
- **Pages simples**: lazy-load via `loadComponent`.
- **Features complexes** (enfants, layouts, multiples guards): lazy-load via `loadChildren`.
- Préférer les **guards fonctionnels**; utiliser `canMatch` pour filtrer dès la résolution de route.

### Exemple

```typescript
import { Routes, CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

export const adminGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.isAdmin(); // boolean, UrlTree ou Promise/Observable
};

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('@features/dashboard/dashboard.page').then(m => m.DashboardPage),
  },
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadChildren: () =>
      import('@features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
];
```

## HTTP client moderne

### Configuration
Fournir `HttpClient` lors du bootstrap (ex. `main.ts`):

```typescript
provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor]))
```

Typage strict des réponses; gestion d'erreurs centralisée (401, 403, 5xx) via interceptors.

### Exemple d'interceptor fonctionnel

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError(err => {
      // mapping d'erreurs, logs, redirections si besoin
      return throwError(() => err);
    })
  );
```

### Bootstrap

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptors([errorInterceptor])
    ),
  ],
});
```

## Templates

### Bonnes pratiques
- Utiliser `@if` / `@for` / `@switch` en priorité.
- Fournir un `track` dans `@for` pour optimiser le rendu.
- Importer explicitement les directives/pipes nécessaires (standalone imports).
- Éviter la logique complexe en template; préférer `computed()`.

## Styles

- CSS à portée de composant par défaut; TailwindCSS optionnel.
- **Thème** (clair/sombre) via variables CSS et service de thème si nécessaire.
- Préférer `[class.xxx]` / `[style.xxx]` pour les cas simples; `ngClass`/`ngStyle` pour compositions plus complexes.

## Environnements et configuration

### Stratégies
Choisir une stratégie et s'y tenir (éviter de mélanger) :

- **Recommandé avec Vite**: fichiers `.env`, `.env.production`, accès via `import.meta.env`. Déclarer les types si besoin.
- **Alternative sans Vite**: `environment.ts` Angular.

Ne pas exposer de secrets dans le bundle; privilégier les variables d'environnement côté serveur.

## Alias d'import

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@core/*": ["app/core/*"],
      "@features/*": ["app/features/*"],
      "@shared/*": ["app/shared/*"]
    }
  }
}
```

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import path from 'node:path';

export default defineConfig({
  plugins: [angular()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/app/core'),
      '@features': path.resolve(__dirname, 'src/app/features'),
      '@shared': path.resolve(__dirname, 'src/app/shared'),
    },
  },
});
```

## Tests

### Configuration
- **Vitest** recommandé avec `@analogjs/vitest-angular`.
- Tester la logique (signaux, services, pipes, guards) et les composants (template + interactions).
- **Conventions**: `*.spec.ts`, structure AAA (Arrange–Act–Assert).
- Utiliser des doubles légers (spies) et éviter les tests d'implémentation.

## Qualité de code et CI

### Outils
- **ESLint** sans erreurs; règles adaptées à Angular moderne (standalone, signals).
- **Prettier** pour le formatage.
- Script `typecheck` (`tsc --noEmit`) et pipeline CI minimal: lint + typecheck + test.
- **Pré-commit**: Husky + lint-staged (lint, prettier:check, typecheck, tests rapides si possible).

### Exemple (extrait) `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
```

### `lint-staged.config.json`

```json
{
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,scss}": ["prettier --write"],
  "tsconfig*.json": ["tsc --noEmit -p tsconfig.json"]
}
```

## Sécurité et accessibilité

### Sécurité
- **Auth**: privilégier cookies HTTP-only quand pertinent; centraliser gestion des erreurs/redirects.
- **Sanitize/escape** les contenus non sûrs; `DomSanitizer` avec parcimonie.

### Accessibilité
- Respecter les attributs **ARIA**, gestion du focus, contraste suffisant.

## Bonnes pratiques supplémentaires

- Éviter les "god services"; favoriser des services orientés domaine (responsabilité unique).
- **Gestion d'erreurs** utilisateur cohérente (toasts/alerts) via un service partagé.
- **Logs**: centraliser et filtrer en production.
- **Documentation** concise (TSDoc) et README d'onboarding.

## Récapitulatif des règles clés

- **Standalone** par default donc inutile de le mettre dans les composants.
- **OnPush** par défaut.
- `input()` / `output()` et `model()` pour le two-way.
- `inject()` en services/guards/interceptors; constructor DI autorisé en composants.
- **Nouveau contrôle de flux** (`@if` / `@for` / `@switch`) et `track` dans `@for`.
- **Signals**: `set`/`update`; `mutate` seulement si justifié.
- **Lazy-load**: `loadComponent` pour pages simples; `loadChildren` + `canMatch` pour features complexes.
- **Suffixes officiels** maintenant plus de suffixes type (`*.component.ts`, `*.service.ts`, …) mais maintenant les fichiers sont (`*.ts, *.html`), juste nommé explicitement sans suffixes !
- **Environnements**: Vite (`import.meta.env`) ou environments Angular — ne pas mélanger.
- **Lint + Prettier + Typecheck** en pré-commit; Vitest pour les tests.
