import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { RefreshResponse } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class RefreshTokenUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(): Observable<RefreshResponse> {
    return this.gateway.refreshToken();
  }
}
