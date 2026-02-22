import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { ForgotPasswordRequest, ForgotPasswordResponse } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class ForgotPasswordUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(request: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.gateway.forgotPassword(request);
  }
}
