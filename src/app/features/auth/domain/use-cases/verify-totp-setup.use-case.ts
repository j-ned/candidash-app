import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { TotpVerifySetupResponse } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class VerifyTotpSetupUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(token: string): Observable<TotpVerifySetupResponse> {
    return this.gateway.verifyTotpSetup(token);
  }
}
