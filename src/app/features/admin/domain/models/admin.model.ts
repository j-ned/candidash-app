import type { UserRole } from '@features/auth/domain/models/auth.model';

export type AdminUser = {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  totpEnabled: boolean;
  createdAt: Date;
  applicationsCount: number;
  lastActivityAt: Date | null;
};

export type DailyVisits = {
  date: string;
  visitors: number;
  pageviews: number;
};

export type RankedEntry = {
  label: string;
  count: number;
};

export type AnalyticsStats = {
  days: number;
  visitors: number;
  pageviews: number;
  daily: DailyVisits[];
  topPages: RankedEntry[];
  topReferrers: RankedEntry[];
};

export type AnalyticsPeriod = 7 | 30 | 90;
