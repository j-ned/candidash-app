import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth';
import { TokenService } from '@core/services/token';
import { environment } from '@environments/environment';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);

  // Vérifier si c'est un appel vers mon API
  const isApiCall = req.url.startsWith(environment.apiUrl);

  // Exclu les endpoints d'authentification du refresh automatique
  const isAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/logout') ||
    req.url.includes('/accounts/registration');

  const token = tokenService.getAccessToken();
  let authReq = req;

  // Pour tous les appels API, inclure withCredentials et le token si disponible
  if (isApiCall) {
    authReq = req.clone({
      setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true, // Important pour les cookies HttpOnly
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si erreur 401 et pas sur un endpoint d'auth, tenter un refresh
      if (
        error.status === 401 &&
        !isAuthEndpoint &&
        isApiCall &&
        tokenService.hasValidRefreshToken()
      ) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            // Réessayer la requête originale avec le nouveau token
            const newToken = tokenService.getAccessToken();
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
              withCredentials: true,
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            // Si le refresh échoue, propager l'erreur
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
