import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { Config } from '@core/services/config';
import { HttpDocumentsGateway } from './http-documents.gateway';
import { documentDetailApi } from '../test-utils/document.builder';

const API_URL = 'http://localhost:3000/api/v1';
const BASE = `${API_URL}/documents`;

describe('HttpDocumentsGateway', () => {
  let gateway: HttpDocumentsGateway;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Config, useValue: { apiUrl: `${API_URL}/` } },
      ],
    });
    gateway = TestBed.inject(HttpDocumentsGateway);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('Given the API base When the list and detail URLs are asked Then they point at /documents', () => {
    // Given / When / Then
    expect({ list: gateway.listUrl(), detail: gateway.detailUrl('d 1') }).toEqual({
      list: BASE,
      detail: `${BASE}/d%201`,
    });
  });

  it('Given a new CV When created Then it POSTs the payload and adapts the answer', async () => {
    // Given
    const payload = { kind: 'CV', title: 'Mon CV', markdown: '# Nom' } as const;

    // When
    const result = firstValueFrom(gateway.create(payload));
    const request = http.expectOne({ method: 'POST', url: BASE });
    request.flush(documentDetailApi({ id: 'd1', markdown: '# Nom' }));

    // Then
    expect(request.request.body).toEqual(payload);
    const created = await result;
    expect(created.id).toBe('d1');
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it('Given changes When saved Then it PUTs them on the document', async () => {
    // Given
    const payload = { title: 'CV Angular', markdown: '# Camille', jobTrackId: null };

    // When
    const result = firstValueFrom(gateway.update('d1', payload));
    const request = http.expectOne({ method: 'PUT', url: `${BASE}/d1` });
    request.flush(documentDetailApi({ id: 'd1', title: 'CV Angular' }));

    // Then
    expect(request.request.body).toEqual(payload);
    expect((await result).title).toBe('CV Angular');
  });

  it('Given a document When duplicated Then it POSTs on /duplicate', async () => {
    // Given / When
    const result = firstValueFrom(gateway.duplicate('d1', {}));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/d1/duplicate` });
    request.flush(documentDetailApi({ id: 'd2', baseDocumentId: 'd1' }));

    // Then
    expect(request.request.body).toEqual({});
    expect((await result).baseDocumentId).toBe('d1');
  });

  it('Given a document When deleted Then it sends DELETE', async () => {
    // Given / When
    const result = firstValueFrom(gateway.delete('d1'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/d1` }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    // Then
    await expect(result).resolves.toBeNull();
  });

  it('Given a document When exported Then it downloads the PDF with the file name chosen by the API', async () => {
    // Given
    const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' });

    // When
    const result = firstValueFrom(gateway.pdf('d1'));
    const request = http.expectOne({ method: 'GET', url: `${BASE}/d1/pdf` });
    request.flush(pdf, {
      headers: { 'Content-Disposition': 'attachment; filename="cv-angular.pdf"' },
    });

    // Then
    expect(request.request.responseType).toBe('blob');
    expect(await result).toEqual({ fileName: 'cv-angular.pdf', blob: pdf });
  });

  it('Given a document linked to an application When attached Then it POSTs on /attach', async () => {
    // Given
    const attached = { jobTrackId: 'jt-1', type: 'cv', fileName: 'cv-angular.pdf' } as const;

    // When
    const result = firstValueFrom(gateway.attach('d1'));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/d1/attach` });
    request.flush(attached);

    // Then
    expect(request.request.body).toEqual({});
    expect(await result).toEqual(attached);
  });
});
