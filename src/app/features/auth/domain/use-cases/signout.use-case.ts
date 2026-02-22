import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class SignoutUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(): Observable<void> {
    return this.gateway.signout();
  }
}
