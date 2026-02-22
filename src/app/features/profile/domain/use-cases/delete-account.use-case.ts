import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProfileGateway } from '../gateways/profile.gateway';

@Injectable({ providedIn: 'root' })
export class DeleteAccountUseCase {
  private readonly gateway = inject(ProfileGateway);

  execute(userId: string): Observable<{ message: string }> {
    return this.gateway.deleteAccount(userId);
  }
}
