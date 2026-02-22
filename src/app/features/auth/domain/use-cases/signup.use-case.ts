import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { RegisterData, RegistrationResponse } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class SignupUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(data: RegisterData): Observable<RegistrationResponse> {
    return this.gateway.signup(data);
  }
}
