import { UserRole } from '@features/auth/models/auth-model';

export interface ProfileData {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  cvPath?: string;
  avatarPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileRequest {
  email?: string;
  username?: string;
  password?: string;
}

export interface UploadAvatarResponse {
  avatarPath: string;
  message: string;
}

export interface UploadCvResponse {
  cvPath: string;
  message: string;
}

export interface DeleteAvatarResponse {
  message: string;
}

export interface DeleteCvResponse {
  message: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileStats {
  totalApplications: number;
  totalRemindersSent: number;
  responseRate: number;
  avgResponseTime: number;
  memberSince: Date;
}
