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

/** label null = accès direct ou origine masquée (applis, messageries, favoris). */
export type SourceEntry = {
  label: string | null;
  count: number;
};

export type AnalyticsStats = {
  days: number;
  visitors: number;
  pageviews: number;
  daily: DailyVisits[];
  topPages: RankedEntry[];
  topSources: SourceEntry[];
};

export type AnalyticsPeriod = 7 | 30 | 90;
