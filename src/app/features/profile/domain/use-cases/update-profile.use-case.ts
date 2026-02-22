import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { ProfileData, UpdateProfileRequest } from '../models/profile.model';
import { ProfileGateway } from '../gateways/profile.gateway';

@Injectable({ providedIn: 'root' })
export class UpdateProfileUseCase {
  private readonly gateway = inject(ProfileGateway);

  execute(userId: string, data: UpdateProfileRequest): Observable<ProfileData> {
    return this.gateway.updateProfile(userId, data);
  }
}
