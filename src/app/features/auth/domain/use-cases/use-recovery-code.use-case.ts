import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { AuthResponse, TotpRecoveryRequest } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class UseRecoveryCodeUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(request: TotpRecoveryRequest): Observable<AuthResponse> {
    return this.gateway.useRecoveryCode(request);
  }
}
