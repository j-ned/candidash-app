import type {
  AuthResponse,
  LoginResponse,
  User,
} from '../domain/models/auth.model';
import type {
  AuthResponseApi,
  LoginResponseApi,
  UserApi,
} from './auth.types';

/** Fonctions pures : DTO API → modèle domain (dates ISO → Date). */
export function toUser(api: UserApi): User {
  return {
    id: api.id,
    email: api.email,
    username: api.username,
    role: api.role,
    totpEnabled: api.totpEnabled,
    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt),
  };
}

export function toAuthResponse(api: AuthResponseApi): AuthResponse {
  return { user: toUser(api.user) };
}

export function toLoginResponse(api: LoginResponseApi): LoginResponse {
  return 'requires2FA' in api ? api : toAuthResponse(api);
}
