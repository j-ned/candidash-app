import { Observable } from 'rxjs';
import type {
  ChangePasswordRequest,
  ProfileData,
  UpdateProfileRequest,
} from '../models/profile.model';

export abstract class ProfileGateway {
  /** URL de la requête GET profil — consommée par un httpResource côté state (full signal). */
  abstract getProfileUrl(userId: string): string;
  abstract updateProfile(userId: string, data: UpdateProfileRequest): Observable<ProfileData>;
  abstract changePassword(data: ChangePasswordRequest): Observable<{ message: string }>;
  abstract deleteAccount(userId: string): Observable<{ message: string }>;
}
