import type {
  TwoFactorPendingResponse,
  UserRole,
} from '../domain/models/auth.model';

/** Forme brute renvoyée par l'API (dates en ISO string). Isolée dans infra. */
export type UserApi = {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponseApi = {
  user: UserApi;
};

export type LoginResponseApi = AuthResponseApi | TwoFactorPendingResponse;
