import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { DeleteJobtrackUseCase } from './delete-jobtrack.use-case';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';

describe('DeleteJobtrackUseCase', () => {
  it.each([{ id: 'jt-1' }, { id: 'jt-2' }])('should call gateway.delete with id $id', ({ id }) => {
    // Given
    const gateway = {
      delete: vi.fn().mockReturnValue(defer(() => of(undefined))),
    };
    TestBed.configureTestingModule({
      providers: [DeleteJobtrackUseCase, { provide: JobtrackGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(DeleteJobtrackUseCase);

    // When
    let completed = false;
    useCase.execute(id).subscribe({ complete: () => (completed = true) });

    // Then
    expect(gateway.delete).toHaveBeenCalledWith(id);
    expect(completed).toBe(true);
  });
});
