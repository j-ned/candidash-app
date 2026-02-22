import type { UserRole } from '@features/auth/domain/models/auth.model';

export type ProfileData = {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  cvPath?: string;
  avatarPath?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateProfileRequest = {
  email?: string;
  username?: string;
  password?: string;
};

export type UploadAvatarResponse = {
  avatarPath: string;
  message: string;
};

export type UploadCvResponse = {
  cvPath: string;
  message: string;
};

export type DeleteAvatarResponse = {
  message: string;
};

export type DeleteCvResponse = {
  message: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ProfileStats = {
  totalApplications: number;
  totalRemindersSent: number;
  responseRate: number;
  avgResponseTime: number;
  memberSince: Date;
};

export type ProfileState = {
  profile: ProfileData | null;
  stats: ProfileStats | null;
  isLoading: boolean;
  error: string | null;
};
