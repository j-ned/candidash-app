import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class ResendVerificationUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(email: string): Observable<{ message: string }> {
    return this.gateway.resendVerificationCode(email);
  }
}
