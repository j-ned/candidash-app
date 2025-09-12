import { CanActivateFn, CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  if (authService.checkAuthStatus()) {
    return authService.autoLogin().pipe(
      map((success) => {
        if (success) {
          return true;
        } else {
          return router.createUrlTree(['/auth/signin']);
        }
      }),
      catchError(() => {
        return of(router.createUrlTree(['/auth/signin']));
      }),
    );
  }

  return router.createUrlTree(['/auth/signin']);
};

export const authMatchGuard: CanMatchFn = () => {
  const authService = inject(AuthService);

  if (authService.isAuthenticated()) {
    return true;
  }

  if (authService.checkAuthStatus()) {
    return authService.autoLogin().pipe(
      map((success) => success),
      catchError(() => of(false)),
    );
  }

  return false;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  if (authService.checkAuthStatus()) {
    return authService.autoLogin().pipe(
      map((success) => {
        if (success) {
          return router.createUrlTree(['/dashboard']);
        } else {
          return true;
        }
      }),
      catchError(() => of(true)),
    );
  }

  return true;
};
