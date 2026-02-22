import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { ChangePasswordRequest } from '../models/profile.model';
import { ProfileGateway } from '../gateways/profile.gateway';

@Injectable({ providedIn: 'root' })
export class ChangePasswordUseCase {
  private readonly gateway = inject(ProfileGateway);

  execute(data: ChangePasswordRequest): Observable<{ message: string }> {
    return this.gateway.changePassword(data);
  }
}
