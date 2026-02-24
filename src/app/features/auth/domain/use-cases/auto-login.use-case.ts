import { Injectable, inject } from '@angular/core';
import { Observable, throwError, EMPTY, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthGateway } from '../gateways/auth.gateway';
import { TokenStore } from '@core/services/token';
import type { User } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AutoLoginUseCase {
  private readonly gateway = inject(AuthGateway);
  private readonly tokenService = inject(TokenStore);

  private autoLoginInProgress = false;

  execute(getStoredUser: () => User | null): Observable<boolean> {
    if (!this.tokenService.hasValidRefreshToken()) {
      return throwError(() => new Error('No refresh token available'));
    }

    if (this.autoLoginInProgress) {
      return EMPTY;
    }

    this.autoLoginInProgress = true;

    return this.gateway.refreshToken().pipe(
      switchMap(() => {
        const user = getStoredUser();
        this.autoLoginInProgress = false;
        if (user) {
          return [true];
        }
        return throwError(() => new Error('No user data available'));
      }),
      catchError(() => {
        this.autoLoginInProgress = false;
        return [false];
      }),
    );
  }
}
