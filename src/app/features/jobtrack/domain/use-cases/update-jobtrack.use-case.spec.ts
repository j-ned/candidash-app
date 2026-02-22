import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { UpdateJobtrackUseCase } from './update-jobtrack.use-case';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';
import { JobTrackBuilder } from '../../test-utils/jobtrack.builder';
import type { JobTrack, UpdateJobTrackWithReminderDto } from '../models/jobtrack.model';

describe('UpdateJobtrackUseCase', () => {
  it.each([
    { upsert: false, label: 'without upsert' },
    { upsert: true, label: 'with upsert' },
  ])('should call gateway.updateWithReminder $label', ({ upsert }) => {
    // Given
    const id = 'jt-1';
    const payload: UpdateJobTrackWithReminderDto = { title: 'Updated Title', status: 'INTERVIEW' };
    const expected: JobTrack = JobTrackBuilder.default().with('title', 'Updated Title').with('status', 'INTERVIEW').build();
    const gateway = {
      updateWithReminder: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [UpdateJobtrackUseCase, { provide: JobtrackGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(UpdateJobtrackUseCase);

    // When
    let result: JobTrack | undefined;
    useCase.execute(id, payload, upsert).subscribe((res) => (result = res));

    // Then
    expect(gateway.updateWithReminder).toHaveBeenCalledWith(id, payload, upsert);
    expect(result).toEqual(expected);
  });
});
