import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { ProfileData } from '../models/profile.model';
import { ProfileGateway } from '../gateways/profile.gateway';

@Injectable({ providedIn: 'root' })
export class GetProfileUseCase {
  private readonly gateway = inject(ProfileGateway);

  execute(userId: string): Observable<ProfileData> {
    return this.gateway.getProfile(userId);
  }
}
