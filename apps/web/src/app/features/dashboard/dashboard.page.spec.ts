import { TestBed } from '@angular/core/testing';
import { ReminderChecker } from '@features/jobtrack/application/reminder-checker';
import {
  JOBS_URL,
  nextMacrotask,
  setupDocumentsTest,
  type Harness,
} from '@features/documents/test-utils/documents-harness';
import { DashboardPage } from './dashboard.page';

describe('Dashboard', () => {
  let harness: Harness;

  afterEach(() => harness.http.verify());

  it('Given the job list request fails When the page renders Then it shows an error with a retry instead of breaking rendering', async () => {
    // Given
    harness = setupDocumentsTest(DashboardPage, true, [
      { provide: ReminderChecker, useValue: { start: vi.fn() } },
    ]);
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    TestBed.tick();

    // When
    harness.http.expectOne(JOBS_URL).flush(null, { status: 502, statusText: 'Bad Gateway' });
    await nextMacrotask();
    fixture.detectChanges();

    // Then
    const host = fixture.nativeElement as HTMLElement;
    const alert = host.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Les candidatures n’ont pas pu être chargées.');

    alert?.querySelector('button')?.click();
    TestBed.tick();
    harness.http.expectOne(JOBS_URL).flush([]);
    await nextMacrotask();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});
