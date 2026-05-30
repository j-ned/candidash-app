import type { UserRole } from '@features/auth/domain/models/auth.model';

/** Forme brute renvoyée par l'API (dates en ISO string). Isolée dans infra. */
export type ProfileDataApi = {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  cvPath?: string;
  avatarPath?: string;
  createdAt: string;
  updatedAt: string;
};
