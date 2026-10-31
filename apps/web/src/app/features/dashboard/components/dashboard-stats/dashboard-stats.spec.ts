import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DashboardStats } from './dashboard-stats';
import { computeJobStats } from '@features/jobtrack/domain/job-stats';
import { JobTrackBuilder } from '@features/jobtrack/test-utils/jobtrack.builder';
import type { JobStatus, JobTrack } from '@features/jobtrack/domain/models/jobtrack.model';

const NOW = new Date(2026, 9, 17, 12, 0, 0);

function job(id: string, status: JobStatus, appliedAt: string | null): JobTrack {
  return JobTrackBuilder.default()
    .with('id', id)
    .with('status', status)
    .with('appliedAt', appliedAt)
    .build();
}

describe('DashboardStats', () => {
  function setup(jobs: JobTrack[]): ComponentFixture<DashboardStats> {
    const fixture = TestBed.createComponent(DashboardStats);
    fixture.componentRef.setInput('stats', computeJobStats(jobs, NOW));
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: ComponentFixture<DashboardStats>, testId: string): string {
    const el: HTMLElement | null = fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
    return el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function all(fixture: ComponentFixture<DashboardStats>, testId: string): HTMLElement[] {
    return [...fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`)];
  }

  it('shows the total and the count of each status', () => {
    // Given / When
    const fixture = setup([
      job('1', 'TO_APPLY', null),
      job('2', 'APPLIED', '2026-10-14T12:00:00'),
      job('3', 'INTERVIEW', '2026-10-02T12:00:00'),
    ]);

    // Then
    expect(text(fixture, 'stat-total')).toBe('3');
    expect(text(fixture, 'stat-status-TO_APPLY')).toBe('1');
    expect(text(fixture, 'stat-status-APPLIED')).toBe('1');
    expect(text(fixture, 'stat-status-INTERVIEW')).toBe('1');
    expect(text(fixture, 'stat-status-ACCEPTED')).toBe('0');
    expect(text(fixture, 'stat-sent-week')).toBe('1');
    expect(text(fixture, 'stat-sent-month')).toBe('2');
  });

  it.each<[string, JobTrack[], string]>([
    ['no sent application', [job('1', 'TO_APPLY', null)], '—'],
    [
      'one interview out of two sent',
      [job('1', 'APPLIED', '2026-10-14T12:00:00'), job('2', 'INTERVIEW', '2026-10-14T12:00:00')],
      '50 %',
    ],
  ])('Given %s, shows the interview rate « %s » with its explanation', (_label, jobs, expected) => {
    // Given / When
    const fixture = setup(jobs);

    // Then
    expect(text(fixture, 'stat-interview-rate').replace(/\u202f|\u00a0/g, ' ')).toBe(expected);
    expect(text(fixture, 'stat-interview-rate-help')).toContain('Entretiens prévus + acceptées');
  });

  it('doubles the weekly chart with a table of the 8 last weeks', () => {
    // Given / When
    const fixture = setup([job('1', 'APPLIED', '2026-10-14T12:00:00')]);

    // Then
    const rows = all(fixture, 'stat-week-row');
    expect(rows).toHaveLength(8);
    expect(rows[7].textContent).toContain('1');
    expect(fixture.nativeElement.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws the conversion funnel from spotted to accepted', () => {
    // Given / When
    const fixture = setup([
      job('1', 'TO_APPLY', null),
      job('2', 'ACCEPTED', '2026-10-14T12:00:00'),
    ]);

    // Then
    const steps = all(fixture, 'stat-funnel-step').map((step) =>
      ['stat-funnel-label', 'stat-funnel-count'].map((testId) =>
        step.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim(),
      ),
    );
    expect(steps).toEqual([
      ['Repérées', '2'],
      ['Envoyées', '1'],
      ['Entretiens', '1'],
      ['Acceptées', '1'],
    ]);
  });
});
