import type { UserRole } from '@features/auth/domain/models/auth.model';

export type AdminUserApi = {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  totpEnabled: boolean;
  createdAt: string;
  applicationsCount: number;
  lastActivityAt: string | null;
};
