import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL, Config } from './config';

const DEFAULT_URL = 'http://localhost:3000/api/v1';

describe('Config', () => {
  let config: Config;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        Config,
        { provide: API_BASE_URL, useValue: DEFAULT_URL },
      ],
    });
    config = TestBed.inject(Config);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('should load apiUrl from /config.json', async () => {
    // Given
    const remoteUrl = 'https://api.production.com/api/v1';

    // When
    const loadPromise = config.loadConfig();
    httpController.expectOne({ method: 'GET', url: '/config.json' }).flush({ apiUrl: remoteUrl });
    await loadPromise;

    // Then
    expect(config.apiUrl).toBe(remoteUrl);
  });

  it('should fallback to default URL when /config.json fails', async () => {
    // Given / When
    const loadPromise = config.loadConfig();
    httpController
      .expectOne({ method: 'GET', url: '/config.json' })
      .flush(null, { status: 404, statusText: 'Not Found' });
    await loadPromise;

    // Then
    expect(config.apiUrl).toBe(DEFAULT_URL);
  });

  it('should return default URL before loadConfig is called', () => {
    // Given / When / Then
    expect(config.apiUrl).toBe(DEFAULT_URL);
  });
});
