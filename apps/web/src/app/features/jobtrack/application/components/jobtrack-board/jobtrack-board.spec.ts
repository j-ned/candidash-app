import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { JobtrackBoard } from './jobtrack-board';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import { Toaster } from '@shared/ui/toast/service/toast';
import { JobTrackBuilder } from '@features/jobtrack/test-utils/jobtrack.builder';
import type { JobStatus, JobTrack } from '@features/jobtrack/domain/models/jobtrack.model';

function job(id: string, status: JobStatus): JobTrack {
  return JobTrackBuilder.default()
    .with('id', id)
    .with('title', `Poste ${id}`)
    .with('company', `Société ${id}`)
    .with('status', status)
    .build();
}

describe('JobtrackBoard', () => {
  let response$: Subject<JobTrack>;
  let gateway: { updateWithReminder: ReturnType<typeof vi.fn> };
  let toaster: { success: ReturnType<typeof vi.fn>; danger: ReturnType<typeof vi.fn> };

  function setup(jobs: JobTrack[]): ComponentFixture<JobtrackBoard> {
    response$ = new Subject<JobTrack>();
    gateway = { updateWithReminder: vi.fn(() => response$) };
    toaster = { success: vi.fn(), danger: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: JobtrackGateway, useValue: gateway },
        { provide: Toaster, useValue: toaster },
      ],
    });
    const fixture = TestBed.createComponent(JobtrackBoard);
    fixture.componentRef.setInput('jobs', jobs);
    fixture.detectChanges();
    return fixture;
  }

  function all(
    fixture: ComponentFixture<JobtrackBoard>,
    testId: string,
    root?: HTMLElement,
  ): HTMLElement[] {
    return [...(root ?? fixture.nativeElement).querySelectorAll(`[data-testid="${testId}"]`)];
  }

  function titlesIn(fixture: ComponentFixture<JobtrackBoard>, status: JobStatus): string[] {
    const [column] = all(fixture, `board-column-${status}`);
    return all(fixture, 'board-card-title', column).map((el) => el.textContent?.trim() ?? '');
  }

  function changeStatus(
    fixture: ComponentFixture<JobtrackBoard>,
    index: number,
    status: JobStatus,
  ): void {
    const select = all(fixture, 'board-card-status')[index] as HTMLSelectElement;
    select.value = status;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('renders one column per status with its count in the header', () => {
    // Given / When
    const fixture = setup([job('1', 'APPLIED'), job('2', 'APPLIED'), job('3', 'REJECTED')]);

    // Then
    const counts = (['TO_APPLY', 'APPLIED', 'INTERVIEW', 'ACCEPTED', 'REJECTED'] as const).map(
      (status) => all(fixture, `board-column-count-${status}`)[0].textContent?.trim(),
    );
    expect(counts).toEqual(['0', '2', '0', '0', '1']);
    expect(titlesIn(fixture, 'APPLIED')).toEqual(['Poste 1', 'Poste 2']);
  });

  it('shows the company and the contract on each card', () => {
    // Given / When
    const fixture = setup([job('1', 'APPLIED')]);

    // Then
    const [card] = all(fixture, 'board-card');
    expect(card.textContent).toContain('Société 1');
    expect(all(fixture, 'board-card-contract')[0].textContent?.trim()).toBe('CDI');
  });

  it('labels the status control with the job title (keyboard alternative to drag and drop)', () => {
    // Given / When
    const fixture = setup([job('1', 'APPLIED')]);

    // Then
    const select = all(fixture, 'board-card-status')[0];
    const label = fixture.nativeElement.querySelector(`label[for="${select.id}"]`);
    expect(label?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Changer de statut : Poste 1');
  });

  it('moves the card optimistically, then saves the status through the gateway', () => {
    // Given
    const fixture = setup([job('1', 'APPLIED'), job('2', 'TO_APPLY')]);

    // When
    changeStatus(fixture, 1, 'INTERVIEW');

    // Then : déplacée avant la réponse du serveur
    expect(titlesIn(fixture, 'APPLIED')).toEqual([]);
    expect(titlesIn(fixture, 'INTERVIEW')).toEqual(['Poste 1']);
    expect(gateway.updateWithReminder).toHaveBeenCalledWith(
      '1',
      { title: 'Poste 1', status: 'INTERVIEW' },
      false,
    );
  });

  it('keeps the server version and confirms with a toast on success', () => {
    // Given
    const fixture = setup([job('1', 'APPLIED')]);
    changeStatus(fixture, 0, 'ACCEPTED');

    // When
    response$.next({ ...job('1', 'ACCEPTED'), notes: 'depuis le serveur' });
    response$.complete();
    fixture.detectChanges();

    // Then
    expect(titlesIn(fixture, 'ACCEPTED')).toEqual(['Poste 1']);
    expect(fixture.componentInstance.jobs()[0].notes).toBe('depuis le serveur');
    expect(toaster.success).toHaveBeenCalledOnce();
    expect(toaster.danger).not.toHaveBeenCalled();
  });

  it('mentions the follow-up reminder when the card is sent', () => {
    // Given
    const fixture = setup([job('1', 'TO_APPLY')]);
    changeStatus(fixture, 0, 'APPLIED');

    // When
    response$.next({
      ...job('1', 'APPLIED'),
      reminder: {
        id: 'r-1',
        jobTrackId: '1',
        frequency: 7,
        nextReminderAt: '2026-10-24T12:00:00.000Z',
        isActive: true,
        createdAt: '2026-10-17T12:00:00.000Z',
        updatedAt: '2026-10-17T12:00:00.000Z',
      },
    });
    response$.complete();

    // Then
    expect(toaster.success).toHaveBeenCalledWith(
      'Statut mis à jour',
      '« Poste 1 » : Envoyées. Rappel pour relancer le 24 oct.',
    );
  });

  it('rolls the card back and warns when the save fails', () => {
    // Given
    const fixture = setup([job('1', 'APPLIED')]);
    changeStatus(fixture, 0, 'REJECTED');

    // When
    response$.error(new Error('500'));
    fixture.detectChanges();

    // Then
    expect(titlesIn(fixture, 'APPLIED')).toEqual(['Poste 1']);
    expect(titlesIn(fixture, 'REJECTED')).toEqual([]);
    expect(fixture.componentInstance.jobs()[0].status).toBe('APPLIED');
    expect(toaster.danger).toHaveBeenCalledOnce();
    expect(toaster.success).not.toHaveBeenCalled();
  });

  it('moves a card dropped on another column', () => {
    // Given
    const fixture = setup([job('1', 'TO_APPLY')]);
    const lists = fixture.debugElement.queryAll(By.directive(CdkDropList));
    const target = lists[2].injector.get(CdkDropList);
    const source = lists[0].injector.get(CdkDropList);

    // When
    target.dropped.emit({
      item: { data: fixture.componentInstance.jobs()[0] },
      container: target,
      previousContainer: source,
    } as unknown as CdkDragDrop<JobStatus, JobStatus, JobTrack>);
    fixture.detectChanges();

    // Then
    expect(titlesIn(fixture, 'INTERVIEW')).toEqual(['Poste 1']);
    expect(gateway.updateWithReminder).toHaveBeenCalledOnce();
  });

  it('ignores a card dropped back on its own column', () => {
    // Given
    const fixture = setup([job('1', 'APPLIED')]);
    const list = fixture.debugElement
      .queryAll(By.directive(CdkDropList))[1]
      .injector.get(CdkDropList);

    // When
    list.dropped.emit({
      item: { data: fixture.componentInstance.jobs()[0] },
      container: list,
      previousContainer: list,
    } as unknown as CdkDragDrop<JobStatus, JobStatus, JobTrack>);

    // Then
    expect(gateway.updateWithReminder).not.toHaveBeenCalled();
  });

  it('opens the job detail when the card is clicked', () => {
    // Given
    const fixture = setup([job('1', 'APPLIED')]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    // When
    all(fixture, 'board-card-title')[0].click();

    // Then
    expect(navigate).toHaveBeenCalledWith(['/dashboard/jobtrack', '1']);
  });
});
