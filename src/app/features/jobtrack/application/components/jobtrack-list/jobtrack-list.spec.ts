import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JobtrackList } from './jobtrack-list';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import type { JobStatus, JobTrack } from '@features/jobtrack/domain/models/jobtrack.model';

function aJob(id: string, status: JobStatus): JobTrack {
  return {
    id,
    userId: 'user-1',
    title: `Poste ${id}`,
    status,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

describe('JobtrackList', () => {
  function setup(jobs: JobTrack[]): ComponentFixture<JobtrackList> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: JobtrackGateway, useValue: {} }],
    });
    const fixture = TestBed.createComponent(JobtrackList);
    fixture.componentRef.setInput('jobs', jobs);
    fixture.detectChanges();
    return fixture;
  }

  function query(fixture: ComponentFixture<JobtrackList>, testId: string): HTMLElement[] {
    return [...fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`)];
  }

  it.each<[JobStatus, string]>([
    ['TO_APPLY', 'repérée'],
    ['APPLIED', 'envoyée'],
    ['REJECTED', 'refusée'],
  ])('shows the short label of a %s job instead of the raw status', (status, label) => {
    // Given / When
    const fixture = setup([aJob('1', status)]);

    // Then
    const [badge] = query(fixture, 'job-status-short');
    expect(badge.textContent?.trim()).toBe(label);
  });

  it('offers a "Repérées" filter with the count of spotted jobs', () => {
    // Given / When
    const fixture = setup([aJob('1', 'TO_APPLY'), aJob('2', 'TO_APPLY'), aJob('3', 'APPLIED')]);

    // Then
    const [filter] = query(fixture, 'status-filter-TO_APPLY');
    expect(filter.textContent?.replace(/\s+/g, ' ').trim()).toBe('Repérées 2');
  });

  it('lists only spotted jobs once the "Repérées" filter is selected', () => {
    // Given
    const fixture = setup([aJob('1', 'TO_APPLY'), aJob('2', 'APPLIED'), aJob('3', 'TO_APPLY')]);

    // When
    query(fixture, 'status-filter-TO_APPLY')[0].click();
    fixture.detectChanges();

    // Then
    const labels = query(fixture, 'job-status-short').map((el) => el.textContent?.trim());
    expect(labels).toEqual(['repérée', 'repérée']);
    expect(query(fixture, 'status-filter-TO_APPLY')[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('shows a dedicated empty state when no job is spotted', () => {
    // Given
    const fixture = setup([aJob('1', 'APPLIED')]);

    // When
    query(fixture, 'status-filter-TO_APPLY')[0].click();
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.textContent).toContain("Aucune offre repérée pour l'instant");
  });
});
