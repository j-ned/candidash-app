import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthState } from '@features/auth/application/auth-state';

// Confort d'affichage seulement : l'API revérifie le rôle en base à chaque appel /admin.
export const adminGuard: CanMatchFn = () =>
  inject(AuthState).isAdmin() || inject(Router).createUrlTree(['/dashboard']);
