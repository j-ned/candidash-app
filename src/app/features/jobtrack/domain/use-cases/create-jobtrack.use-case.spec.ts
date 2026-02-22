import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { CreateJobtrackUseCase } from './create-jobtrack.use-case';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';
import { JobTrackBuilder } from '../../test-utils/jobtrack.builder';
import type { CreateJobTrackWithReminderDto, JobTrack } from '../models/jobtrack.model';

describe('CreateJobtrackUseCase', () => {
  it('should call gateway.createWithReminder with payload', () => {
    // Given
    const payload: CreateJobTrackWithReminderDto = {
      title: 'Frontend Developer',
      company: 'Acme Corp',
      status: 'APPLIED',
      frequency: 7,
      nextReminderAt: '2024-02-01T10:00:00Z',
    };
    const expected: JobTrack = JobTrackBuilder.default().build();
    const gateway = {
      createWithReminder: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [CreateJobtrackUseCase, { provide: JobtrackGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(CreateJobtrackUseCase);

    // When
    let result: JobTrack | undefined;
    useCase.execute(payload).subscribe((res) => (result = res));

    // Then
    expect(gateway.createWithReminder).toHaveBeenCalledWith(payload);
    expect(result).toEqual(expected);
  });
});
