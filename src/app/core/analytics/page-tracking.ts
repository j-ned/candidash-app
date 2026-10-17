import { DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Config } from '@core/services/config';
import { AuthState } from '@features/auth/application/auth-state';

type TrackPayload = { path: string; referrer?: string };

function refusesTracking(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1';
}

function externalReferrer(): string | undefined {
  const referrer = document.referrer;
  if (!referrer) return undefined;
  try {
    return new URL(referrer).host === location.host ? undefined : referrer;
  } catch {
    return undefined;
  }
}

/**
 * Mesure d'audience : une page vue par navigation, sans cookie ni identifiant côté navigateur.
 * Rien n'est envoyé pour un administrateur, ni sous Global Privacy Control / Do Not Track.
 */
export function startPageTracking(): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID)) || refusesTracking()) return;

  const http = inject(HttpClient);
  const config = inject(Config);
  const auth = inject(AuthState);
  let referrer = externalReferrer();

  inject(Router)
    .events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(inject(DestroyRef)),
    )
    .subscribe((event) => {
      if (auth.isAdmin()) return;
      const payload: TrackPayload = referrer
        ? { path: event.urlAfterRedirects, referrer }
        : { path: event.urlAfterRedirects };
      referrer = undefined;
      http.post(`${config.apiUrl}/analytics/track`, payload).subscribe({ error: () => undefined });
    });
}
