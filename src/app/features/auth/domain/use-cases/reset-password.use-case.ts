import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { ResetPasswordRequest, ResetPasswordResponse } from '../models/auth.model';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class ResetPasswordUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(request: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    return this.gateway.resetPassword(request);
  }
}
