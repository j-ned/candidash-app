import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth';

/**
 * Interceptor fonctionnel qui ajoute automatiquement le token JWT aux requêtes HTTP
 * Compatible avec Angular 20+ et les interceptors fonctionnels modernes
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  // Si un token est disponible, l'ajouter au header Authorization
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  // Sinon, passer la requête sans modification
  return next(req);
};
