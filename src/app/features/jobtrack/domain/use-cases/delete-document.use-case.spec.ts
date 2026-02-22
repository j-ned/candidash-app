import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { DeleteDocumentUseCase } from './delete-document.use-case';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';
import type { DocumentType } from '../models/jobtrack.model';

describe('DeleteDocumentUseCase', () => {
  it.each([
    { type: 'cv' as DocumentType },
    { type: 'lm' as DocumentType },
  ])('should call gateway.deleteDocument for type $type', ({ type }) => {
    // Given
    const jobTrackId = 'jt-1';
    const gateway = {
      deleteDocument: vi.fn().mockReturnValue(defer(() => of(undefined))),
    };
    TestBed.configureTestingModule({
      providers: [DeleteDocumentUseCase, { provide: JobtrackGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(DeleteDocumentUseCase);

    // When
    let completed = false;
    useCase.execute(jobTrackId, type).subscribe({ complete: () => (completed = true) });

    // Then
    expect(gateway.deleteDocument).toHaveBeenCalledWith(jobTrackId, type);
    expect(completed).toBe(true);
  });
});
