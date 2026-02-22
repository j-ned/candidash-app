import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { AuthResponse, LoginCredentials } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class SigninUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.gateway.signin(credentials);
  }
}
