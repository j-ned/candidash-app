# Extension Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `TO_APPLY` job status to the UI, and a "Extension navigateur" section on the Profile page to generate/list/revoke API tokens consumed by the Chrome extension.

**Architecture:** New `ApiTokenGateway` (abstract class, matching the existing `JobtrackGateway`/`ProfileGateway` convention in this repo) + `HttpApiTokenGateway` implementation, wired into `app.config.ts` like the other gateways. A new smart component `ProfileApiTokens` injects the gateway directly (no separate state class — this feature isn't shared across sibling components, unlike `ProfileState`) and is added to the existing `ProfileLayout` grid.

**Tech Stack:** Angular 22 (standalone, signals, zoneless, `ChangeDetectionStrategy.OnPush`), `HttpClient` + `HttpTestingController` for gateway tests.

**Environment note (verified against this checkout, overrides earlier assumptions):**
- **Tests:** `ng test` is broken in this repo (angular.json still registers the old `@angular/build:karma` builder, but `karma-jasmine` isn't installed — a leftover from an incomplete migration). The actual, working, currently-used test command is `pnpm test` (= `vitest run`, per `package.json`), which runs the existing TestBed-based specs (gateway/state tests) correctly — 38 tests pass on a clean baseline. Use `pnpm test -- <substring>` to filter by filename, and plain `pnpm test` for the full suite. Do not use `ng test`.
- **Lint:** there is no `lint` script in `package.json` and no `lint` target in `angular.json`, but `eslint.config.js` exists and `npx eslint <path>` works. The repo has 4 pre-existing lint errors in files unrelated to this plan (`auth.gateway.ts`, `jobtrack-list.ts`, `server.ts`, `vitest.config.ts`) — do NOT run `npx eslint .` (repo-wide) as a pass/fail gate, it will always show these unrelated failures. Instead run `npx eslint <the exact files this task touched>` (no `--fix`) — plain `eslint` without `--fix` is read-only/non-mutating, so this is safe and gives a real signal scoped to new code only.

## Global Constraints

- `ApiTokenGateway` is an `abstract class` with a single implementation — deliberately matching this repo's existing convention (`JobtrackGateway`, `ProfileGateway`), not the stricter YAGNI-gateway rule in `CLAUDE.md` (confirmed with the user — consistency with the existing codebase wins here).
- No component spec files — this repo doesn't unit-test presentational/smart components (`profile-security`, `profile-2fa`, etc. have none), only gateways and shared cross-component state classes. `ProfileApiTokens` follows that same convention.
- Icons must come from the existing sprite (`public/icons/sprite.svg`) — only use icon names already present there.
- Selectors `data-testid` are N/A here (no component tests in this plan), but if a future test is added, follow that convention.

---

## Task 1: Add the `TO_APPLY` job status to the UI

**Files:**
- Modify: `src/app/features/jobtrack/domain/models/jobtrack.model.ts`

**Interfaces:**
- Produces: `JobStatus` now includes `'TO_APPLY'`; `STATUS_CONFIG['TO_APPLY']`; `ALL_STATUSES` includes it.

This is a data-only change (no branching logic to test) — same treatment as the backend's enum change, no dedicated spec.

- [ ] **Step 1: Add `TO_APPLY` everywhere in the model**

In `src/app/features/jobtrack/domain/models/jobtrack.model.ts`, find:

```ts
export type JobStatus = 'APPLIED' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED';
```

Replace with:

```ts
export type JobStatus = 'TO_APPLY' | 'APPLIED' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED';
```

Find:

```ts
export const STATUS_CONFIG: Record<JobStatus, {
```

Add, as the first entry of that `Record` literal (before `APPLIED`):

```ts
  TO_APPLY:  { emoji: '🔖', label: 'Repérée',            labelShort: 'Repérée',        badgeClass: 'bg-muted/15 text-muted border-muted/30', hoverClass: 'hover:bg-muted/15 hover:text-muted hover:border-muted/40' },
```

Find:

```ts
export const ALL_STATUSES: JobStatus[] = ['APPLIED', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
```

Replace with:

```ts
export const ALL_STATUSES: JobStatus[] = ['TO_APPLY', 'APPLIED', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
```

- [ ] **Step 2: Verify the app still builds and lints**

Run: `ng build && npx eslint src/app/features/jobtrack/domain/models/jobtrack.model.ts`
Expected: both succeed — the build confirms every existing `switch`/`Record<JobStatus, ...>` usage elsewhere in the codebase still compiles with the new union member (TypeScript would error on a non-exhaustive `Record<JobStatus, T>` if any other status map exists and wasn't updated).

- [ ] **Step 3: Commit**

```bash
git add src/app/features/jobtrack/domain/models/jobtrack.model.ts
git commit -m "feat(jobtrack): ajoute le statut TO_APPLY (annonce repérée, pas encore postulée)"
```

---

## Task 2: `ApiTokenGateway` — domain, infra, provider wiring

**Files:**
- Create: `src/app/features/profile/domain/models/api-token.model.ts`
- Create: `src/app/features/profile/domain/gateways/api-token.gateway.ts`
- Create: `src/app/features/profile/infra/api-token.types.ts`
- Create: `src/app/features/profile/infra/api-token.adapter.ts`
- Create: `src/app/features/profile/infra/http-api-token.gateway.ts`
- Test: `src/app/features/profile/infra/http-api-token.gateway.spec.ts`
- Modify: `src/app/app.config.ts`

**Interfaces:**
- Consumes: `Config` (`@core/services/config`, `configService.apiUrl`).
- Produces: `ApiToken { id, nomAffiche, createdAt, derniereUtilisation? }`, `ApiTokenCreated extends ApiToken { token: string }`, `ApiTokenGateway.create(nomAffiche: string): Observable<ApiTokenCreated>`, `.list(): Observable<ApiToken[]>`, `.revoke(id: string): Observable<{ message: string }>` — consumed by Task 3.

- [ ] **Step 1: Create the domain model**

Create `src/app/features/profile/domain/models/api-token.model.ts`:

```ts
export type ApiToken = {
  id: string;
  nomAffiche: string;
  createdAt: Date;
  derniereUtilisation?: Date;
};

export type ApiTokenCreated = ApiToken & {
  token: string;
};
```

- [ ] **Step 2: Create the abstract gateway**

Create `src/app/features/profile/domain/gateways/api-token.gateway.ts`:

```ts
import { Observable } from 'rxjs';
import type { ApiToken, ApiTokenCreated } from '../models/api-token.model';

export abstract class ApiTokenGateway {
  abstract create(nomAffiche: string): Observable<ApiTokenCreated>;
  abstract list(): Observable<ApiToken[]>;
  abstract revoke(id: string): Observable<{ message: string }>;
}
```

- [ ] **Step 3: Write the failing gateway test**

Create `src/app/features/profile/infra/http-api-token.gateway.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { HttpApiTokenGateway } from './http-api-token.gateway';
import { Config } from '@core/services/config';

const API_URL = 'http://localhost:3000/api/v1';

describe('HttpApiTokenGateway', () => {
  let gateway: HttpApiTokenGateway;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpApiTokenGateway,
        { provide: Config, useValue: { apiUrl: API_URL } },
      ],
    });
    gateway = TestBed.inject(HttpApiTokenGateway);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('should POST /api-tokens and map dates from the API response', async () => {
    const apiResponse = {
      id: 'token-1',
      nomAffiche: 'Extension Chrome',
      createdAt: '2026-08-23T10:00:00.000Z',
      token: 'ctok_abc',
    };

    const resultPromise = firstValueFrom(gateway.create('Extension Chrome'));
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/api-tokens` })
      .flush(apiResponse);

    const result = await resultPromise;
    expect(result.token).toBe('ctok_abc');
    expect(result.createdAt).toEqual(new Date('2026-08-23T10:00:00.000Z'));
  });

  it('should GET /api-tokens and map each item', async () => {
    const apiResponse = [
      {
        id: 'token-1',
        nomAffiche: 'Extension Chrome',
        createdAt: '2026-08-23T10:00:00.000Z',
      },
    ];

    const resultPromise = firstValueFrom(gateway.list());
    httpController
      .expectOne({ method: 'GET', url: `${API_URL}/api-tokens` })
      .flush(apiResponse);

    const result = await resultPromise;
    expect(result).toHaveLength(1);
    expect(result[0].nomAffiche).toBe('Extension Chrome');
    expect(result[0].derniereUtilisation).toBeUndefined();
  });

  it('should DELETE /api-tokens/:id', async () => {
    const expected = { message: 'Jeton révoqué' };

    const resultPromise = firstValueFrom(gateway.revoke('token-1'));
    httpController
      .expectOne({ method: 'DELETE', url: `${API_URL}/api-tokens/token-1` })
      .flush(expected);

    expect(await resultPromise).toEqual(expected);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm test -- http-api-token.gateway`
Expected: FAIL — `./http-api-token.gateway` module doesn't exist yet.

- [ ] **Step 5: Create the infra types and adapter**

Create `src/app/features/profile/infra/api-token.types.ts`:

```ts
export type ApiTokenApi = {
  id: string;
  nomAffiche: string;
  createdAt: string;
  derniereUtilisation?: string;
};

export type ApiTokenCreatedApi = ApiTokenApi & {
  token: string;
};
```

Create `src/app/features/profile/infra/api-token.adapter.ts`:

```ts
import type { ApiToken, ApiTokenCreated } from '../domain/models/api-token.model';
import type { ApiTokenApi, ApiTokenCreatedApi } from './api-token.types';

/** Fonction pure : DTO API → modèle domain (dates ISO → Date). */
export function toApiToken(api: ApiTokenApi): ApiToken {
  return {
    id: api.id,
    nomAffiche: api.nomAffiche,
    createdAt: new Date(api.createdAt),
    derniereUtilisation: api.derniereUtilisation
      ? new Date(api.derniereUtilisation)
      : undefined,
  };
}

export function toApiTokenCreated(api: ApiTokenCreatedApi): ApiTokenCreated {
  return { ...toApiToken(api), token: api.token };
}
```

- [ ] **Step 6: Implement the HTTP gateway**

Create `src/app/features/profile/infra/http-api-token.gateway.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Config } from '@core/services/config';
import { ApiTokenGateway } from '../domain/gateways/api-token.gateway';
import type { ApiToken, ApiTokenCreated } from '../domain/models/api-token.model';
import type { ApiTokenApi, ApiTokenCreatedApi } from './api-token.types';
import { toApiToken, toApiTokenCreated } from './api-token.adapter';

@Injectable()
export class HttpApiTokenGateway extends ApiTokenGateway {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(Config);

  private get baseUrl(): string {
    return `${this.configService.apiUrl}/api-tokens`;
  }

  create(nomAffiche: string): Observable<ApiTokenCreated> {
    return this.http
      .post<ApiTokenCreatedApi>(this.baseUrl, { nomAffiche })
      .pipe(map(toApiTokenCreated));
  }

  list(): Observable<ApiToken[]> {
    return this.http
      .get<ApiTokenApi[]>(this.baseUrl)
      .pipe(map((items) => items.map(toApiToken)));
  }

  revoke(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm test -- http-api-token.gateway`
Expected: PASS (3 tests).

- [ ] **Step 8: Wire the provider**

In `src/app/app.config.ts`, add the imports (next to the other gateway imports):

```ts
import { ApiTokenGateway } from '@features/profile/domain/gateways/api-token.gateway';
import { HttpApiTokenGateway } from '@features/profile/infra/http-api-token.gateway';
```

And add to the `providers` array (next to the other `provide: ...Gateway` entries):

```ts
    { provide: JobtrackGateway, useClass: HttpJobtrackGateway },
    { provide: ProfileGateway, useClass: HttpProfileGateway },
    { provide: ApiTokenGateway, useClass: HttpApiTokenGateway },
```

- [ ] **Step 9: Run the full build**

Run: `ng build`
Expected: succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/app/features/profile/domain/models/api-token.model.ts \
  src/app/features/profile/domain/gateways/api-token.gateway.ts \
  src/app/features/profile/infra/api-token.types.ts \
  src/app/features/profile/infra/api-token.adapter.ts \
  src/app/features/profile/infra/http-api-token.gateway.ts \
  src/app/features/profile/infra/http-api-token.gateway.spec.ts \
  src/app/app.config.ts
git commit -m "feat(profile): ajoute ApiTokenGateway pour la gestion des jetons d'extension"
```

---

## Task 3: `ProfileApiTokens` component

**Files:**
- Create: `src/app/features/profile/application/components/profile-api-tokens/profile-api-tokens.ts`
- Modify: `src/app/features/profile/application/profile-layout.ts`

**Interfaces:**
- Consumes: `ApiTokenGateway` (Task 2), `ApiToken`/`ApiTokenCreated` (Task 2), `Toaster` (`@shared/ui/toast/service/toast`), `ConfirmModal` (`@shared/ui/confirm-modal/confirm-modal`), `Icon` (`@shared/ui/icon/icon`), `Button` (`@shared/ui/button/button`).

No dedicated spec for this component — matching this repo's convention that smart/presentational components (`ProfileSecurity`, `ProfileInfo`, `Profile2fa`) aren't unit-tested; behavior here is exercised through the gateway test (Task 2) plus manual verification (Step 3 below).

- [ ] **Step 1: Implement the component**

Create `src/app/features/profile/application/components/profile-api-tokens/profile-api-tokens.ts`:

```ts
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from '@shared/ui/icon/icon';
import { Button } from '@shared/ui/button/button';
import { Toaster } from '@shared/ui/toast/service/toast';
import { ConfirmModal } from '@shared/ui/confirm-modal/confirm-modal';
import { ApiTokenGateway } from '@features/profile/domain/gateways/api-token.gateway';
import type { ApiToken, ApiTokenCreated } from '@features/profile/domain/models/api-token.model';

@Component({
  selector: 'app-profile-api-tokens',
  imports: [Icon, Button, DatePipe],
  host: {
    class: 'block bg-card border border-border rounded-md p-4 sm:rounded-lg sm:p-6',
    role: 'region',
    '[attr.aria-labelledby]': '"api-tokens-title"',
  },
  template: `
    <h2
      id="api-tokens-title"
      class="text-lg font-semibold text-text mb-4 flex items-center mt-3 sm:text-xl sm:mb-6 sm:mt-5"
    >
      <app-icon name="lucide-settings" cssClass="w-5 h-5 mr-2 sm:w-6 sm:h-6" />
      Extension navigateur
    </h2>

    <p class="text-sm text-muted mb-4">
      Génère un jeton pour connecter l'extension Chrome Candidash. Il n'est
      affiché qu'une seule fois.
    </p>

    @if (newlyCreatedToken(); as created) {
      <div
        class="mb-4 p-3 border border-primary/40 rounded bg-primary/5 space-y-2"
        role="alert"
      >
        <p class="text-sm font-medium text-text">
          Jeton créé — copie-le maintenant, il ne sera plus jamais affiché :
        </p>
        <div class="flex items-center gap-2">
          <code
            class="flex-1 text-xs sm:text-sm break-all bg-background border border-border rounded px-2 py-1"
            >{{ created.token }}</code
          >
          <button
            type="button"
            (click)="copyToken(created.token)"
            aria-label="Copier le jeton"
            class="text-muted hover:text-text transition-colors"
          >
            <app-icon name="lucide-copy" cssClass="w-4 h-4" />
          </button>
        </div>
      </div>
    }

    @if (isLoading()) {
      <p class="text-sm text-muted" role="status">Chargement...</p>
    } @else if (tokens().length === 0) {
      <p class="text-sm text-muted">Aucun jeton actif.</p>
    } @else {
      <ul class="space-y-2 mb-4">
        @for (t of tokens(); track t.id) {
          <li
            class="flex items-center justify-between gap-2 text-sm border border-border rounded px-3 py-2"
          >
            <div>
              <p class="text-text font-medium">{{ t.nomAffiche }}</p>
              <p class="text-muted text-xs">
                Créé le {{ t.createdAt | date: 'dd/MM/yyyy' }}
                @if (t.derniereUtilisation) {
                  · Utilisé le {{ t.derniereUtilisation | date: 'dd/MM/yyyy' }}
                }
              </p>
            </div>
            <button
              type="button"
              (click)="revoke(t)"
              [attr.aria-label]="'Révoquer le jeton ' + t.nomAffiche"
              class="text-error hover:text-error/80 transition-colors"
            >
              <app-icon name="lucide-trash-2" cssClass="w-4 h-4" />
            </button>
          </li>
        }
      </ul>
    }

    <app-button
      (buttonClick)="generate()"
      [isLoading]="isGenerating()"
      customClass="w-full sm:w-auto px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base"
    >
      <app-icon name="lucide-plus" cssClass="w-4 h-4 mr-2" />
      Générer un jeton
    </app-button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileApiTokens {
  private readonly apiTokenGateway = inject(ApiTokenGateway);
  private readonly toaster = inject(Toaster);
  private readonly confirmModal = inject(ConfirmModal);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tokens = signal<ApiToken[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isGenerating = signal(false);
  protected readonly newlyCreatedToken = signal<ApiTokenCreated | null>(null);

  constructor() {
    this.loadTokens();
  }

  private loadTokens(): void {
    this.isLoading.set(true);
    this.apiTokenGateway
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tokens) => {
          this.tokens.set(tokens);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toaster.show('danger', "Impossible de charger les jetons d'API");
        },
      });
  }

  generate(): void {
    this.isGenerating.set(true);
    this.apiTokenGateway
      .create('Extension Chrome')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.isGenerating.set(false);
          this.newlyCreatedToken.set(created);
          this.tokens.update((tokens) => [created, ...tokens]);
          this.toaster.show('success', 'Jeton créé');
        },
        error: () => {
          this.isGenerating.set(false);
          this.toaster.show('danger', 'Échec de la création du jeton');
        },
      });
  }

  revoke(token: ApiToken): void {
    void this.confirmAndRevoke(token);
  }

  private async confirmAndRevoke(token: ApiToken): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Révoquer ce jeton ?',
      message: `"${token.nomAffiche}" ne pourra plus être utilisé par l'extension.`,
      confirmText: 'Révoquer',
      type: 'danger',
    });
    if (!confirmed) return;

    this.apiTokenGateway
      .revoke(token.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.tokens.update((tokens) => tokens.filter((t) => t.id !== token.id));
          if (this.newlyCreatedToken()?.id === token.id) {
            this.newlyCreatedToken.set(null);
          }
          this.toaster.show('success', 'Jeton révoqué');
        },
        error: () => this.toaster.show('danger', 'Échec de la révocation'),
      });
  }

  copyToken(token: string): void {
    void navigator.clipboard.writeText(token).then(() => {
      this.toaster.show('success', 'Jeton copié');
    });
  }
}
```

- [ ] **Step 2: Wire it into the Profile page**

In `src/app/features/profile/application/profile-layout.ts`, add the import:

```ts
import { ProfileApiTokens } from './components/profile-api-tokens/profile-api-tokens';
```

Add `ProfileApiTokens` to the component's `imports` array:

```ts
  imports: [Layout, ProfileHeader, ProfileInfo, ProfileSecurity, Profile2fa, ProfileApiTokens],
```

Add `<app-profile-api-tokens />` to the template, right after `<app-profile-2fa />`:

```ts
          <app-profile-2fa />
          <app-profile-api-tokens />
```

- [ ] **Step 3: Manual verification**

Run: `ng serve`, log in, navigate to the Profile page. Confirm:
- The "Extension navigateur" section renders below the existing sections.
- Clicking "Générer un jeton" shows the one-time secret with a working copy button (and a toast).
- The generated token appears in the list below.
- Clicking the trash icon opens the confirm modal; confirming removes the token from the list and shows a toast; cancelling leaves it untouched.

- [ ] **Step 4: Run the full test suite, lint, and build**

Run: `pnpm test && npx eslint src/app/features/profile/application/components/profile-api-tokens/profile-api-tokens.ts src/app/features/profile/application/profile-layout.ts && ng build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/profile/application/components/profile-api-tokens \
  src/app/features/profile/application/profile-layout.ts
git commit -m "feat(profile): ajoute la section Extension navigateur (génération/révocation de jetons)"
```
