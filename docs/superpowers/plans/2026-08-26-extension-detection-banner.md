# Extension Detection Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a dismissible banner on the landing page and the dashboard announcing the Candidash Chrome extension, hidden automatically once it's detected as installed.

**Architecture:** `Config` gains an optional `extensionId`. A new `ExtensionDetection` root service pings the extension via `chrome.runtime.sendMessage(extensionId, ...)` (the browser side of the `externally_connectable` contract implemented in the sibling `chrome-candidash-extension` repo) with a 500ms timeout, exposing a signal-based `status`. A new `ExtensionBanner` component renders the "coming soon" or "install" copy based on that status, hides itself once installed, and is dismissible (persisted to `localStorage`). Wired explicitly into `home.ts` and `dashboard.page.ts` — not into the shared `Layout`, which is also used by `auth`/`profile` pages that are out of scope.

**Tech Stack:** Angular 21 signals, Vitest (zoneless — `vi.useFakeTimers()` / `vi.advanceTimersByTimeAsync`, never `fakeAsync`), no new dependencies (chrome typing is a small local type, not `@types/chrome`).

**Spec:** `docs/superpowers/specs/2026-08-26-extension-detection-banner-design.md`

## Global Constraints

- Ping timeout: exactly 500ms.
- Message contract with the extension: send `{ type: 'PING' }`, a reply is "installed" only if it's an object with `pong === true` — anything else (no reply, error, malformed reply) means "not installed".
- `localStorage` key for dismissal: exactly `extension-banner-dismissed`, value `'true'`.
- Web Store URL format: `https://chromewebstore.google.com/detail/{extensionId}`.
- Banner goes in `home.ts` and `dashboard.page.ts` only — not in `shared/ui/layout/layout.ts`.
- Tests run with `pnpm test` (this repo's `ng test` is broken — confirmed in prior work, see repo `CLAUDE.md`/memory).
- Zoneless project: no `fakeAsync`/`tick` — use `vi.useFakeTimers()` + `await vi.advanceTimersByTimeAsync(ms)`, and `await fixture.whenStable()` for `afterNextRender`/signal-effect stability.
- Provider mocks in tests use plain `useValue: { ... }` object literals with no type cast — this is the established pattern in this repo (see `auth-state.spec.ts`), because Angular's `Provider.useValue` is typed loosely enough not to need one.

---

### Task 1: `Config.extensionId`

**Files:**
- Modify: `src/app/core/services/config.ts`
- Modify: `src/app/core/services/config.spec.ts`

**Interfaces:**
- Produces: `Config.extensionId: string | undefined` (getter) — consumed by Task 2 (`ExtensionDetection`) and Task 3 (`ExtensionBanner`'s Web Store link).

- [ ] **Step 1: Write the failing test**

Add to `src/app/core/services/config.spec.ts`, inside the existing `describe('Config', ...)` block:

```typescript
  it('should load extensionId from /config.json', async () => {
    // Given
    const remoteId = 'abcdefghijklmnopabcdefghijklmnop';

    // When
    const loadPromise = config.loadConfig();
    httpController
      .expectOne({ method: 'GET', url: '/config.json' })
      .flush({ apiUrl: DEFAULT_URL, extensionId: remoteId });
    await loadPromise;

    // Then
    expect(config.extensionId).toBe(remoteId);
  });

  it('should return undefined extensionId when /config.json omits it', async () => {
    // Given / When
    const loadPromise = config.loadConfig();
    httpController.expectOne({ method: 'GET', url: '/config.json' }).flush({ apiUrl: DEFAULT_URL });
    await loadPromise;

    // Then
    expect(config.extensionId).toBeUndefined();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/core/services/config.spec.ts`
Expected: FAIL — `config.extensionId` is `undefined` is not the failure (that one would pass by accident); the first new test fails because `Property 'extensionId' does not exist on type 'Config'` (TypeScript compile error surfaces as a Vitest transform failure).

- [ ] **Step 3: Write the minimal implementation**

In `src/app/core/services/config.ts`, change:

```typescript
export type AppConfig = {
  apiUrl: string;
};
```

to:

```typescript
export type AppConfig = {
  apiUrl: string;
  extensionId?: string;
};
```

And add, next to the existing `apiUrl` getter:

```typescript
  get extensionId(): string | undefined {
    return this.config?.extensionId;
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/core/services/config.spec.ts`
Expected: PASS, all 5 tests green (3 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/config.ts src/app/core/services/config.spec.ts
git commit -m "feat(config): add optional extensionId to runtime config"
```

---

### Task 2: `ExtensionDetection` service

**Files:**
- Create: `src/app/shared/ui/extension-banner/service/extension-detection.ts`
- Test: `src/app/shared/ui/extension-banner/service/extension-detection.spec.ts`

**Interfaces:**
- Consumes: `Config.extensionId` from Task 1.
- Produces: `ExtensionStatus = 'unknown' | 'checking' | 'installed' | 'not-installed' | 'unavailable'` (exported type), `ExtensionDetection` class with `status: Signal<ExtensionStatus>` (readonly) and `check(): void` — consumed by Task 3 (`ExtensionBanner`).

- [ ] **Step 1: Write the failing tests**

Create `src/app/shared/ui/extension-banner/service/extension-detection.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ExtensionDetection } from './extension-detection';
import { Config } from '@core/services/config';

describe('ExtensionDetection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function setup(extensionId: string | undefined): ExtensionDetection {
    TestBed.configureTestingModule({
      providers: [ExtensionDetection, { provide: Config, useValue: { extensionId } }],
    });
    return TestBed.inject(ExtensionDetection);
  }

  it('is unavailable when no extensionId is configured', () => {
    // Given
    const detection = setup(undefined);

    // When
    detection.check();

    // Then
    expect(detection.status()).toBe('unavailable');
  });

  it('is unavailable when chrome.runtime is not present (non-Chromium browser)', () => {
    // Given
    vi.stubGlobal('chrome', undefined);
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();

    // Then
    expect(detection.status()).toBe('unavailable');
  });

  it('is installed when the extension replies with pong before the timeout', async () => {
    // Given
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (
          _extensionId: string,
          _message: unknown,
          callback: (reply: unknown) => void,
        ) => callback({ pong: true }),
      },
    });
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();
    // Two microtask ticks: one for the sendMessage callback to resolve
    // pingReply, one for Promise.race's own wrapping .then().
    await Promise.resolve();
    await Promise.resolve();

    // Then
    expect(detection.status()).toBe('installed');
  });

  it('is not-installed when the reply is malformed', async () => {
    // Given
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (
          _extensionId: string,
          _message: unknown,
          callback: (reply: unknown) => void,
        ) => callback({ somethingElse: true }),
      },
    });
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();
    await Promise.resolve();
    await Promise.resolve();

    // Then
    expect(detection.status()).toBe('not-installed');
  });

  it('is not-installed when the extension does not reply before the timeout', async () => {
    // Given
    vi.useFakeTimers();
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: () => {
          // no callback invocation — simulates an uninstalled/unresponsive extension
        },
      },
    });
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();
    await vi.advanceTimersByTimeAsync(500);

    // Then
    expect(detection.status()).toBe('not-installed');
  });

  it('does not re-check once a status has been resolved', async () => {
    // Given
    const sendMessage = vi.fn(
      (_id: string, _msg: unknown, cb: (reply: unknown) => void) => cb({ pong: true }),
    );
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();
    await Promise.resolve();
    await Promise.resolve();
    detection.check();

    // Then
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/shared/ui/extension-banner/service/extension-detection.spec.ts`
Expected: FAIL — `Failed to resolve import "./extension-detection"` (module doesn't exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/app/shared/ui/extension-banner/service/extension-detection.ts`:

```typescript
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Config } from '@core/services/config';

export type ExtensionStatus =
  | 'unknown'
  | 'checking'
  | 'installed'
  | 'not-installed'
  | 'unavailable';

export const PING_TIMEOUT_MS = 500;

type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (reply: unknown) => void,
  ) => void;
  readonly lastError?: { message?: string };
};

function getChromeRuntime(): ChromeRuntime | undefined {
  return (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
}

function isPongReply(reply: unknown): boolean {
  return typeof reply === 'object' && reply !== null && (reply as { pong?: unknown }).pong === true;
}

@Injectable({ providedIn: 'root' })
export class ExtensionDetection {
  private readonly config = inject(Config);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _status = signal<ExtensionStatus>('unknown');
  readonly status = this._status.asReadonly();

  check(): void {
    if (this._status() !== 'unknown') return;

    const extensionId = this.config.extensionId;
    const runtime = this.isBrowser ? getChromeRuntime() : undefined;

    if (!extensionId || !runtime) {
      this._status.set('unavailable');
      return;
    }

    this._status.set('checking');
    void this.ping(runtime, extensionId).then((installed) => {
      this._status.set(installed ? 'installed' : 'not-installed');
    });
  }

  private ping(runtime: ChromeRuntime, extensionId: string): Promise<boolean> {
    const pingReply = new Promise<boolean>((resolve) => {
      try {
        runtime.sendMessage(extensionId, { type: 'PING' }, (reply) => {
          void runtime.lastError;
          resolve(isPongReply(reply));
        });
      } catch {
        resolve(false);
      }
    });

    const timeout = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), PING_TIMEOUT_MS);
    });

    return Promise.race([pingReply, timeout]);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/shared/ui/extension-banner/service/extension-detection.spec.ts`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/extension-banner/service/extension-detection.ts src/app/shared/ui/extension-banner/service/extension-detection.spec.ts
git commit -m "feat(extension-banner): add ExtensionDetection service"
```

---

### Task 3: `ExtensionBanner` component

**Files:**
- Create: `src/app/shared/ui/extension-banner/extension-banner.ts`
- Test: `src/app/shared/ui/extension-banner/extension-banner.spec.ts`

**Interfaces:**
- Consumes: `ExtensionDetection` (`status`, `check()`) from Task 2, `Config.extensionId` from Task 1.
- Produces: standalone component `ExtensionBanner`, selector `app-extension-banner` — consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

Create `src/app/shared/ui/extension-banner/extension-banner.spec.ts`:

```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ExtensionBanner } from './extension-banner';
import { ExtensionDetection } from './service/extension-detection';
import type { ExtensionStatus } from './service/extension-detection';
import { Config } from '@core/services/config';

describe('ExtensionBanner', () => {
  let statusSignal: WritableSignal<ExtensionStatus>;
  let checkSpy: ReturnType<typeof vi.fn>;

  function setup(extensionId: string | undefined): ComponentFixture<ExtensionBanner> {
    statusSignal = signal<ExtensionStatus>('unknown');
    checkSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: ExtensionDetection, useValue: { status: statusSignal.asReadonly(), check: checkSpy } },
        { provide: Config, useValue: { extensionId } },
      ],
    });

    return TestBed.createComponent(ExtensionBanner);
  }

  afterEach(() => localStorage.clear());

  it('calls check() once the component has rendered', async () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    fixture.detectChanges();
    await fixture.whenStable();

    // Then
    expect(checkSpy).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while the status is unknown or checking', () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();

    // When
    statusSignal.set('checking');
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('shows the "coming soon" message and no link when unavailable', () => {
    // Given
    const fixture = setup(undefined);

    // When
    statusSignal.set('unavailable');
    fixture.detectChanges();

    // Then
    const el = fixture.nativeElement.querySelector('[role="status"]');
    expect(el).not.toBeNull();
    expect(el.textContent).toContain('bientôt');
    expect(el.querySelector('a')).toBeNull();
  });

  it('shows the install link with the Web Store URL when not installed', () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    statusSignal.set('not-installed');
    fixture.detectChanges();

    // Then
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.href).toBe('https://chromewebstore.google.com/detail/abcdefghijklmnopabcdefghijklmnop');
  });

  it('hides the banner when installed', () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    statusSignal.set('installed');
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('dismisses and persists the choice to localStorage', () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');
    statusSignal.set('not-installed');
    fixture.detectChanges();

    // When
    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Fermer ce message"]',
    );
    closeButton.click();
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(localStorage.getItem('extension-banner-dismissed')).toBe('true');
  });

  it('stays hidden on a fresh render when a previous dismissal was persisted', () => {
    // Given
    localStorage.setItem('extension-banner-dismissed', 'true');
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    statusSignal.set('not-installed');
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/shared/ui/extension-banner/extension-banner.spec.ts`
Expected: FAIL — `Failed to resolve import "./extension-banner"` (module doesn't exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/app/shared/ui/extension-banner/extension-banner.ts`:

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Icon } from '@shared/ui/icon/icon';
import { Config } from '@core/services/config';
import { ExtensionDetection } from './service/extension-detection';

const DISMISSED_KEY = 'extension-banner-dismissed';

@Component({
  selector: 'app-extension-banner',
  imports: [Icon],
  template: `
    @if (visible()) {
      <div
        role="status"
        class="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm mb-4"
      >
        <div class="flex items-center gap-2">
          <app-icon name="lucide-download" cssClass="w-4 h-4 text-primary shrink-0" />
          @if (status() === 'not-installed') {
            <span class="text-text">
              Ajoute une annonce en un clic pendant que tu navigues, avec l'extension Chrome Candidash.
            </span>
            <a
              [href]="webStoreUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-primary hover:underline shrink-0 inline-flex items-center gap-1"
            >
              Installer
              <app-icon name="lucide-external-link" cssClass="w-3 h-3" />
            </a>
          } @else {
            <span class="text-text">
              L'extension Chrome Candidash arrive bientôt — ajoute une annonce en un clic pendant que tu navigues.
            </span>
          }
        </div>
        <button
          type="button"
          (click)="dismiss()"
          aria-label="Fermer ce message"
          class="text-muted hover:text-text transition-colors shrink-0"
        >
          <app-icon name="lucide-x" cssClass="w-4 h-4" />
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionBanner {
  private readonly detection = inject(ExtensionDetection);
  private readonly config = inject(Config);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly status = this.detection.status;
  private readonly dismissed = signal(this.readDismissed());

  protected readonly visible = computed(
    () => !this.dismissed() && (this.status() === 'not-installed' || this.status() === 'unavailable'),
  );

  protected readonly webStoreUrl = computed(
    () => `https://chromewebstore.google.com/detail/${this.config.extensionId}`,
  );

  constructor() {
    afterNextRender(() => this.detection.check());
  }

  dismiss(): void {
    this.dismissed.set(true);
    if (this.isBrowser) {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
  }

  private readDismissed(): boolean {
    if (!this.isBrowser) return false;
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  }
}
```

Note the field declaration order matters: `isBrowser` must be initialized before `dismissed` (which calls `this.readDismissed()`, reading `this.isBrowser`) — keep them in this exact order.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/shared/ui/extension-banner/extension-banner.spec.ts`
Expected: PASS, all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/extension-banner/extension-banner.ts src/app/shared/ui/extension-banner/extension-banner.spec.ts
git commit -m "feat(extension-banner): add ExtensionBanner component"
```

---

### Task 4: Wire the banner into the landing page and the dashboard

**Files:**
- Modify: `src/app/features/home/home.ts`
- Modify: `src/app/features/dashboard/dashboard.page.ts`

**Interfaces:**
- Consumes: `ExtensionBanner` (selector `app-extension-banner`) from Task 3.

- [ ] **Step 1: Add the banner to `home.ts`**

In `src/app/features/home/home.ts`:
- Add the import: `import { ExtensionBanner } from '@shared/ui/extension-banner/extension-banner';`
- Add `ExtensionBanner` to the component's `imports` array (currently `[RouterLink, Button, Layout, Icon]`).
- Add `<app-extension-banner />` as the first child inside `<app-layout>`, right before the existing `<div class="flex-1 flex flex-col ...">` wrapper.

- [ ] **Step 2: Add the banner to `dashboard.page.ts`**

In `src/app/features/dashboard/dashboard.page.ts`:
- Add the import: `import { ExtensionBanner } from '@shared/ui/extension-banner/extension-banner';`
- Add `ExtensionBanner` to the component's `imports` array (currently `[Layout, Button, JobtrackList, Icon]`).
- Add `<app-extension-banner />` as the first child inside `<app-layout>`, right before the existing `<div class="relative overflow-hidden">` wrapper.

- [ ] **Step 3: Build and typecheck**

Run: `pnpm build`
Expected: build succeeds with no errors — this exercises both templates and confirms `ExtensionBanner`'s standalone imports resolve.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: PASS, no regressions (no new tests added in this task — `home.ts`/`dashboard.page.ts` have no existing spec files, consistent with the rest of this task's scope; the banner itself is already fully tested in Task 3).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/home/home.ts src/app/features/dashboard/dashboard.page.ts
git commit -m "feat(extension-banner): wire the banner into the landing page and dashboard"
```
