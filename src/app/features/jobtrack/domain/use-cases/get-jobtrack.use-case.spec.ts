import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { GetJobtrackUseCase } from './get-jobtrack.use-case';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';
import { JobTrackBuilder } from '../../test-utils/jobtrack.builder';
import type { JobTrack } from '../models/jobtrack.model';

describe('GetJobtrackUseCase', () => {
  it.each([
    { id: 'jt-1', expected: JobTrackBuilder.default().build() },
    { id: 'jt-2', expected: JobTrackBuilder.default().with('id', 'jt-2').with('title', 'Backend Dev').build() },
  ])('should call gateway.get with id $id', ({ id, expected }) => {
    // Given
    const gateway = {
      get: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [GetJobtrackUseCase, { provide: JobtrackGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(GetJobtrackUseCase);

    // When
    let result: JobTrack | undefined;
    useCase.execute(id).subscribe((res) => (result = res));

    // Then
    expect(gateway.get).toHaveBeenCalledWith(id);
    expect(result).toEqual(expected);
  });
});
