import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from '@features/auth/application/auth-state.service';
import { TokenService } from '@core/services/token';
import { Config } from '@core/services/config';
import { Observable, catchError, switchMap, throwError, share } from 'rxjs';
import type { RefreshResponse } from '@features/auth/domain/models/auth.model';

let refreshInFlight$: Observable<RefreshResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthStateService);
  const tokenService = inject(TokenService);
  const config = inject(Config);

  const isApiCall = req.url.startsWith(config.apiUrl);

  const isAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/logout') ||
    req.url.includes('/accounts/registration') ||
    req.url.includes('/auth/2fa/validate') ||
    req.url.includes('/auth/2fa/recovery');

  let authReq = req;

  if (isApiCall) {
    authReq = req.clone({
      withCredentials: true,
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        !isAuthEndpoint &&
        isApiCall &&
        tokenService.hasValidRefreshToken()
      ) {
        // Share a single refresh Observable across concurrent 401s
        if (!refreshInFlight$) {
          refreshInFlight$ = authService.refreshToken().pipe(
            share({
              resetOnComplete: true,
              resetOnError: true,
              resetOnRefCountZero: true,
            }),
          );

          // Clear the shared observable after it completes or errors
          refreshInFlight$.subscribe({
            complete: () => (refreshInFlight$ = null),
            error: () => (refreshInFlight$ = null),
          });
        }

        return refreshInFlight$.pipe(
          switchMap(() => {
            const retryReq = req.clone({
              withCredentials: true,
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
