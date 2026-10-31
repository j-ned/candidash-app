import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Config } from '@core/services/config';
import { ProfileGateway } from '../domain/gateways/profile.gateway';
import type {
  ChangePasswordRequest,
  ProfileData,
  UpdateProfileRequest,
} from '../domain/models/profile.model';
import type { ProfileDataApi } from './profile.types';
import { toProfileData } from './profile.adapter';

@Injectable()
export class HttpProfileGateway extends ProfileGateway {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(Config);

  private get baseUrl(): string {
    return this.configService.apiUrl;
  }

  getProfileUrl(userId: string): string {
    return `${this.baseUrl}/accounts/profile/${userId}`;
  }

  updateProfile(userId: string, data: UpdateProfileRequest): Observable<ProfileData> {
    return this.http
      .put<ProfileDataApi>(`${this.baseUrl}/accounts/profile-update/${userId}`, data)
      .pipe(map(toProfileData));
  }

  changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/accounts/change-password`, data);
  }

  deleteAccount(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/accounts/deactivation/${userId}`,
    );
  }
}
