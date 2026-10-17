import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Config } from '@core/services/config';
import { AuthState } from '@features/auth/application/auth-state';
import { startPageTracking } from './page-tracking';

@Component({ template: '' })
class Blank {}

describe('startPageTracking', () => {
  const API = 'https://api.example.test/api/v1';
  let isAdmin: ReturnType<typeof signal<boolean>>;

  function setup(): { router: Router; http: HttpTestingController } {
    isAdmin = signal(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: Blank },
          { path: 'features', component: Blank },
        ]),
        { provide: Config, useValue: { apiUrl: API } },
        { provide: AuthState, useValue: { isAdmin } },
      ],
    });
    TestBed.runInInjectionContext(() => startPageTracking());
    return { router: TestBed.inject(Router), http: TestBed.inject(HttpTestingController) };
  }

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.inject(HttpTestingController).verify();
  });

  it('reports each page with the external referrer on the first one only', async () => {
    // Given
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://www.google.com/');
    const { router, http } = setup();

    // When
    await router.navigateByUrl('/');
    const first = http.expectOne(`${API}/analytics/track`);
    first.flush(null);
    await router.navigateByUrl('/features?utm=1');
    const second = http.expectOne(`${API}/analytics/track`);
    second.flush(null);

    // Then
    expect(first.request.body).toEqual({ path: '/', referrer: 'https://www.google.com/' });
    expect(second.request.body).toEqual({ path: '/features?utm=1' });
  });

  it('reports nothing for an admin', async () => {
    // Given
    const { router, http } = setup();
    isAdmin.set(true);

    // When
    await router.navigateByUrl('/features');

    // Then
    http.expectNone(`${API}/analytics/track`);
  });

  it('respects Global Privacy Control', async () => {
    // Given
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    const { router, http } = setup();

    // When
    await router.navigateByUrl('/features');

    // Then
    http.expectNone(`${API}/analytics/track`);
    Reflect.deleteProperty(navigator, 'globalPrivacyControl');
  });
});
