import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { DashboardStats as DashboardStatsModel } from '@features/dashboard/components/dashboard-stats/model/dashboard-stats';

@Component({
  selector: 'app-dashboard-stats',
  templateUrl: './dashboard-stats.html',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStats {
  stats = input.required<DashboardStatsModel>();
}
