import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { TotpSetupResponse } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class SetupTotpUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(): Observable<TotpSetupResponse> {
    return this.gateway.setupTotp();
  }
}
