import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { AuthResponse, VerifyRegistrationRequest } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class VerifyRegistrationUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(data: VerifyRegistrationRequest): Observable<AuthResponse> {
    return this.gateway.verifyRegistration(data);
  }
}
