import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { DownloadDocumentUseCase } from './download-document.use-case';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';
import type { DocumentType } from '../models/jobtrack.model';

describe('DownloadDocumentUseCase', () => {
  it.each([
    { type: 'cv' as DocumentType },
    { type: 'lm' as DocumentType },
  ])('should call gateway.downloadDocument for type $type', ({ type }) => {
    // Given
    const jobTrackId = 'jt-1';
    const expected = new Blob(['pdf-content'], { type: 'application/pdf' });
    const gateway = {
      downloadDocument: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [DownloadDocumentUseCase, { provide: JobtrackGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(DownloadDocumentUseCase);

    // When
    let result: Blob | undefined;
    useCase.execute(jobTrackId, type).subscribe((res) => (result = res));

    // Then
    expect(gateway.downloadDocument).toHaveBeenCalledWith(jobTrackId, type);
    expect(result).toEqual(expected);
  });
});
