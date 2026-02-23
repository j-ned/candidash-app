import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { LoginCredentials, LoginResponse } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class SigninUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.gateway.signin(credentials);
  }
}
