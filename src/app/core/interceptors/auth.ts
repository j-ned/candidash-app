import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthState } from '@features/auth/application/auth-state';
import { TokenStore } from '@core/services/token';
import { Config } from '@core/services/config';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthState);
  const tokenService = inject(TokenStore);
  const config = inject(Config);

  const isApiCall = req.url.startsWith(config.apiUrl);

  const isAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/logout') ||
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
        // AuthState partage un seul refresh entre les 401 concurrents
        return authService
          .refreshToken()
          .pipe(switchMap(() => next(req.clone({ withCredentials: true }))));
      }

      return throwError(() => error);
    }),
  );
};
