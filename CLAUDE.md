# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CandiDash is an Angular 20 job application tracker with a dashboard. The frontend communicates with a separate NestJS backend (`nest-candidash-app`) via REST API at `/api/v1/...`.

## Commands

```bash
pnpm install              # Install dependencies
pnpm start                # Dev server at http://localhost:4200
pnpm build                # Production build
pnpm test                 # Run all tests once (Vitest)
pnpm test:watch           # Run tests in watch mode
npx vitest path/to/file   # Run a single test file
npx eslint .              # Lint (no npm script defined)
```

Docker build with API URL:
```bash
docker build -t candidash-frontend --build-arg API_URL=http://localhost:3000 .
docker run --rm -p 8080:80 candidash-frontend
```

## Architecture

### Stack
- **Angular 20** with standalone components (no NgModules), **Tailwind CSS 4** (PostCSS plugin, CSS-based config via `@theme` in `styles.css`), **Vitest** with jsdom + `@analogjs/vite-plugin-angular`.

### Clean Architecture (Hexagonal / Ports & Adapters)

Each feature is structured in 3 layers: **domain** (pure logic) → **infra** (HTTP adapters) → **application** (state, UI components).

**Dependency rule**: domain never imports from infra or application. Infra implements domain contracts. Application orchestrates use cases + state + UI.

### Directory Layout

```
src/app/
├── core/                              # Transverse services
│   ├── guards/auth.ts                 # authGuard, guestGuard, authMatchGuard
│   ├── interceptors/auth.ts           # Bearer token + 401 refresh-retry
│   └── services/
│       ├── token.ts                   # In-memory access token (signal)
│       └── config.ts                  # Runtime API URL from /config.json
│
├── features/
│   ├── auth/
│   │   ├── domain/
│   │   │   ├── models/auth.model.ts       # User, AuthState, LoginCredentials, etc. (types)
│   │   │   ├── gateways/auth.gateway.ts   # abstract class AuthGateway
│   │   │   └── use-cases/                 # signin, signup, signout, verify-registration,
│   │   │                                  # resend-verification, forgot-password, reset-password,
│   │   │                                  # refresh-token, auto-login
│   │   ├── infra/
│   │   │   └── http-auth.gateway.ts       # HttpClient implementation of AuthGateway
│   │   └── application/
│   │       ├── auth-state.service.ts      # Signal state + orchestration (toasts, navigation)
│   │       └── (components remain in auth/components/)
│   │
│   ├── jobtrack/
│   │   ├── domain/
│   │   │   ├── models/jobtrack.model.ts   # JobTrack, JobStatus, Reminder, DTOs (types)
│   │   │   ├── gateways/jobtrack.gateway.ts
│   │   │   └── use-cases/                 # list, get, create, update, delete
│   │   ├── infra/
│   │   │   └── http-jobtrack.gateway.ts
│   │   └── application/
│   │       └── components/                # jobtrack-list, jobtrack-form
│   │
│   ├── profile/
│   │   ├── domain/
│   │   │   ├── models/profile.model.ts    # ProfileData, ChangePasswordRequest, etc. (types)
│   │   │   ├── gateways/profile.gateway.ts
│   │   │   └── use-cases/                 # get-profile, update-profile, change-password, delete-account
│   │   ├── infra/
│   │   │   └── http-profile.gateway.ts
│   │   └── application/
│   │       ├── profile-state.service.ts   # Signal state for profile
│   │       ├── profile-layout.ts
│   │       └── components/                # profile-header, profile-info, profile-security, simple-avatar
│   │
│   ├── dashboard/                         # Orchestrates jobtrack, no own domain
│   │   ├── dashboard.page.ts
│   │   ├── route/dashboard.routes.ts
│   │   └── components/dashboard-stats/
│   │
│   ├── home/                              # No business logic
│   └── legal/                             # No business logic
│
├── shared/ui/                             # Reusable UI: button, toast, layout, modals, theme
├── shared/utils/                          # Small utility functions
└── app.config.ts                          # Gateway → Implementation DI providers
```

### Key Patterns

**Clean Architecture DI**: Gateways (abstract classes) are mapped to HTTP implementations in `app.config.ts`:
```typescript
{ provide: AuthGateway, useClass: HttpAuthGateway },
{ provide: JobtrackGateway, useClass: HttpJobtrackGateway },
{ provide: ProfileGateway, useClass: HttpProfileGateway },
```

**Use Cases**: Each use case is a `@Injectable` class with one `execute()` method that delegates to the gateway. Components inject use cases, not gateways directly.

**State services**: `AuthStateService` and `ProfileStateService` manage signal-based state and orchestrate side effects (toasts, navigation, localStorage). Components inject these for state reads.

**Domain models**: All models use `type` (not `interface`). Union types instead of enums (e.g., `type UserRole = 'USER' | 'ADMIN'`).

**State management**: No NgRx. Services use Angular signals (`signal()`, `computed()`, `effect()`). Pattern: private `signal<State>` + public `computed()` selectors.

**Dependency injection**: Always `inject()` function, never constructor injection. Properties are `private readonly`.

**Routing**: All routes lazy-loaded via `loadComponent()` / `loadChildren()`. Auth-protected routes use `authGuard`; guest-only routes use `guestGuard`.

**Authentication**: JWT access token stored in-memory (`TokenService` signal). Refresh token is an HttpOnly cookie (backend-managed). Auth interceptor auto-attaches Bearer token and handles 401 refresh-retry. User data cached in `localStorage` key `auth_user`.

**API URL resolution**: `Config` service loads `/config.json` at startup via `provideAppInitializer()`; falls back to `http://localhost:3000/api/v1`. No `environment.ts` — the auth interceptor and all gateways use `Config.apiUrl`.

**Templates**: Use Angular control flow blocks (`@if`, `@for` with `track`, `@else`) — not structural directives.

**Modals**: Programmatic via `createComponent()` + `ApplicationRef.attachView()` + DOM append (no CDK).

## Code Conventions

- **All components**: `ChangeDetectionStrategy.OnPush`, standalone
- **Inputs/Outputs**: `input()` / `input.required()` and `output()` signal APIs (not decorators)
- **Selectors**: `app-` prefix, kebab-case
- **Tests**: `*.spec.ts` co-located next to source files, TestBed-style

### File Naming

| Element | Pattern | Example |
|---------|---------|---------|
| Domain model | `*.model.ts` | `auth.model.ts` |
| Gateway (contract) | `*.gateway.ts` | `auth.gateway.ts` |
| Gateway (impl) | `http-*.gateway.ts` | `http-auth.gateway.ts` |
| Use case | `*.use-case.ts` | `signin.use-case.ts` |
| State service | `*-state.service.ts` | `auth-state.service.ts` |
| Use case method | `execute()` | — |
| Component | kebab-case | `signin.ts` |
| Routes | `feature.routes.ts` | `auth.routes.ts` |

**Host binding pattern**: Components with a single wrapper element (`<div>`, `<section>`, `<header>`) move classes/attributes to `host: {}` in `@Component` to reduce DOM nesting. Custom elements are `display: inline` by default — add `block` (or `flex`) in host classes.

### Path Aliases (tsconfig)
- `@app/*` → `src/app/*`
- `@core/*` → `src/app/core/*`
- `@features/*` → `src/app/features/*`
- `@shared/*` → `src/app/shared/*`

### Enforced Lint Rules
- `prefer-readonly`, `prefer-nullish-coalescing` (`??` over `||`), `prefer-optional-chain`
- Prettier: 100 char width, single quotes, angular parser for HTML
- Template max: 3 conditional complexity, 5 cyclomatic complexity
