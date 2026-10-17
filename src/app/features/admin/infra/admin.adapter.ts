import type { AdminUser } from '../domain/models/admin.model';
import type { AdminUserApi } from './admin.types';

export function toAdminUsers(raw: AdminUserApi[]): AdminUser[] {
  return raw.map((user) => ({
    ...user,
    createdAt: new Date(user.createdAt),
    lastActivityAt: user.lastActivityAt ? new Date(user.lastActivityAt) : null,
  }));
}
