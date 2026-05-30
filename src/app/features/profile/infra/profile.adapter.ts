import type { ProfileData } from '../domain/models/profile.model';
import type { ProfileDataApi } from './profile.types';

/** Fonction pure : DTO API → modèle domain (dates ISO → Date). */
export function toProfileData(api: ProfileDataApi): ProfileData {
  return {
    id: api.id,
    email: api.email,
    username: api.username,
    role: api.role,
    cvPath: api.cvPath,
    avatarPath: api.avatarPath,
    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt),
  };
}
