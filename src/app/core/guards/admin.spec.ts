import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthState } from '@features/auth/application/auth-state';
import { adminGuard } from './admin';

describe('adminGuard', () => {
  function run(isAdmin: boolean): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthState, useValue: { isAdmin: signal(isAdmin) } },
      ],
    });
    return TestBed.runInInjectionContext(() => adminGuard({}, [])) as boolean | UrlTree;
  }

  it('lets an admin in', () => {
    expect(run(true)).toBe(true);
  });

  it('sends anyone else back to the dashboard', () => {
    const result = run(false);

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
  });
});
