import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class DisableTotpUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(password: string): Observable<{ message: string }> {
    return this.gateway.disableTotp(password);
  }
}
