import { Observable } from 'rxjs';
import type {
  ChangePasswordRequest,
  ProfileData,
  UpdateProfileRequest,
} from '../models/profile.model';

export abstract class ProfileGateway {
  abstract getProfile(userId: string): Observable<ProfileData>;
  abstract updateProfile(userId: string, data: UpdateProfileRequest): Observable<ProfileData>;
  abstract changePassword(data: ChangePasswordRequest): Observable<{ message: string }>;
  abstract deleteAccount(userId: string): Observable<{ message: string }>;
}
