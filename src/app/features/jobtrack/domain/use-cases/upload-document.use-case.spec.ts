import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { UploadDocumentUseCase } from './upload-document.use-case';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';
import type { DocumentType } from '../models/jobtrack.model';

describe('UploadDocumentUseCase', () => {
  it.each([
    { type: 'cv' as DocumentType, fileName: 'mon-cv.pdf' },
    { type: 'lm' as DocumentType, fileName: 'lettre-motivation.pdf' },
  ])('should call gateway.uploadDocument for type $type', ({ type, fileName }) => {
    // Given
    const jobTrackId = 'jt-1';
    const file = new File(['content'], fileName, { type: 'application/pdf' });
    const expected = { fileName };
    const gateway = {
      uploadDocument: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [UploadDocumentUseCase, { provide: JobtrackGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(UploadDocumentUseCase);

    // When
    let result: { fileName: string } | undefined;
    useCase.execute(jobTrackId, type, file).subscribe((res) => (result = res));

    // Then
    expect(gateway.uploadDocument).toHaveBeenCalledWith(jobTrackId, type, file);
    expect(result).toEqual(expected);
  });
});
