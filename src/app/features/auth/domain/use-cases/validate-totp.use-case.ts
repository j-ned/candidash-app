import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { AuthResponse, ValidateTotpRequest } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class ValidateTotpUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(request: ValidateTotpRequest): Observable<AuthResponse> {
    return this.gateway.validateTotp(request);
  }
}
