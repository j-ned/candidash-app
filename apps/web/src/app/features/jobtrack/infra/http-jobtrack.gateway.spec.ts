import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { HttpJobtrackGateway } from './http-jobtrack.gateway';
import { Config } from '@core/services/config';
import { JobTrackBuilder } from '../test-utils/jobtrack.builder';
import type { CreateJobTrackWithReminderDto, UpdateJobTrackWithReminderDto } from '../domain/models/jobtrack.model';

const API_URL = 'http://localhost:3000/api/v1';
const BASE = `${API_URL}/jobtrack`;

describe('HttpJobtrackGateway', () => {
  let gateway: HttpJobtrackGateway;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpJobtrackGateway,
        { provide: Config, useValue: { apiUrl: API_URL } },
      ],
    });
    gateway = TestBed.inject(HttpJobtrackGateway);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('should GET /jobtrack to list all', async () => {
    // Given
    const expected = [JobTrackBuilder.default().build()];

    // When
    const resultPromise = firstValueFrom(gateway.list());
    httpController.expectOne({ method: 'GET', url: BASE }).flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should GET /jobtrack/status/APPLIED to list by status', async () => {
    // Given
    const expected = [JobTrackBuilder.default().build()];

    // When
    const resultPromise = firstValueFrom(gateway.listByStatus('APPLIED'));
    httpController.expectOne({ method: 'GET', url: `${BASE}/status/APPLIED` }).flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should GET /jobtrack/:id', async () => {
    // Given
    const expected = JobTrackBuilder.default().build();

    // When
    const resultPromise = firstValueFrom(gateway.get('jt-1'));
    httpController.expectOne({ method: 'GET', url: `${BASE}/jt-1` }).flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should POST /jobtrack/with-reminder to create', async () => {
    // Given
    const payload: CreateJobTrackWithReminderDto = {
      title: 'Dev',
      frequency: 7,
      nextReminderAt: '2024-02-01T10:00:00Z',
    };
    const expected = JobTrackBuilder.default().build();

    // When
    const resultPromise = firstValueFrom(gateway.createWithReminder(payload));
    httpController.expectOne({ method: 'POST', url: `${BASE}/with-reminder` }).flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should PUT /jobtrack/:id/with-reminder?upsert=false to update', async () => {
    // Given
    const payload: UpdateJobTrackWithReminderDto = { title: 'Updated' };
    const expected = JobTrackBuilder.default().with('title', 'Updated').build();

    // When
    const resultPromise = firstValueFrom(gateway.updateWithReminder('jt-1', payload, false));
    httpController
      .expectOne({ method: 'PUT', url: `${BASE}/jt-1/with-reminder?upsert=false` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should PUT /jobtrack/:id/with-reminder?upsert=true', async () => {
    // Given
    const payload: UpdateJobTrackWithReminderDto = { title: 'Upserted' };
    const expected = JobTrackBuilder.default().with('title', 'Upserted').build();

    // When
    const resultPromise = firstValueFrom(gateway.updateWithReminder('jt-1', payload, true));
    httpController
      .expectOne({ method: 'PUT', url: `${BASE}/jt-1/with-reminder?upsert=true` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should DELETE /jobtrack/:id', async () => {
    // Given / When
    const resultPromise = firstValueFrom(gateway.delete('jt-1'));
    httpController.expectOne({ method: 'DELETE', url: `${BASE}/jt-1` }).flush(null);

    // Then
    await resultPromise;
  });

  it('should POST /jobtrack/:id/cv to upload document', async () => {
    // Given
    const file = new File(['content'], 'cv.pdf', { type: 'application/pdf' });
    const expected = { fileName: 'cv.pdf' };

    // When
    const resultPromise = firstValueFrom(gateway.uploadDocument('jt-1', 'cv', file));
    httpController.expectOne({ method: 'POST', url: `${BASE}/jt-1/cv` }).flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should GET /jobtrack/:id/lm to download document', async () => {
    // Given
    const expected = new Blob(['pdf'], { type: 'application/pdf' });

    // When
    const resultPromise = firstValueFrom(gateway.downloadDocument('jt-1', 'lm'));
    httpController.expectOne({ method: 'GET', url: `${BASE}/jt-1/lm` }).flush(expected);

    // Then
    const result = await resultPromise;
    expect(result).toBeInstanceOf(Blob);
  });

  it('should DELETE /jobtrack/:id/cv to delete document', async () => {
    // Given / When
    const resultPromise = firstValueFrom(gateway.deleteDocument('jt-1', 'cv'));
    httpController.expectOne({ method: 'DELETE', url: `${BASE}/jt-1/cv` }).flush(null);

    // Then
    await resultPromise;
  });
});
