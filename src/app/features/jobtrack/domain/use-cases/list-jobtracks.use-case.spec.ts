import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { ListJobtracksUseCase } from './list-jobtracks.use-case';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';
import { JobTrackBuilder } from '../../test-utils/jobtrack.builder';
import type { JobTrack } from '../models/jobtrack.model';

describe('ListJobtracksUseCase', () => {
  it('should call gateway.list and return all jobtracks', () => {
    // Given
    const expected: JobTrack[] = [
      JobTrackBuilder.default().build(),
      JobTrackBuilder.default().with('id', 'jt-2').with('title', 'Backend Developer').build(),
    ];
    const gateway = {
      list: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [ListJobtracksUseCase, { provide: JobtrackGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(ListJobtracksUseCase);

    // When
    let result: JobTrack[] | undefined;
    useCase.execute().subscribe((res) => (result = res));

    // Then
    expect(gateway.list).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });
});
