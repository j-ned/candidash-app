import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { HttpApiTokenGateway } from './http-api-token.gateway';
import { Config } from '@core/services/config';

const API_URL = 'http://localhost:3000/api/v1';

describe('HttpApiTokenGateway', () => {
  let gateway: HttpApiTokenGateway;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpApiTokenGateway,
        { provide: Config, useValue: { apiUrl: API_URL } },
      ],
    });
    gateway = TestBed.inject(HttpApiTokenGateway);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('should POST /api-tokens and map dates from the API response', async () => {
    const apiResponse = {
      id: 'token-1',
      nomAffiche: 'Extension Chrome',
      createdAt: '2026-08-23T10:00:00.000Z',
      token: 'ctok_abc',
    };

    const resultPromise = firstValueFrom(gateway.create('Extension Chrome'));
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/api-tokens` })
      .flush(apiResponse);

    const result = await resultPromise;
    expect(result.token).toBe('ctok_abc');
    expect(result.createdAt).toEqual(new Date('2026-08-23T10:00:00.000Z'));
  });

  it('should GET /api-tokens and map each item', async () => {
    const apiResponse = [
      {
        id: 'token-1',
        nomAffiche: 'Extension Chrome',
        createdAt: '2026-08-23T10:00:00.000Z',
      },
    ];

    const resultPromise = firstValueFrom(gateway.list());
    httpController
      .expectOne({ method: 'GET', url: `${API_URL}/api-tokens` })
      .flush(apiResponse);

    const result = await resultPromise;
    expect(result).toHaveLength(1);
    expect(result[0].nomAffiche).toBe('Extension Chrome');
    expect(result[0].derniereUtilisation).toBeUndefined();
  });

  it('should DELETE /api-tokens/:id', async () => {
    const expected = { message: 'Jeton révoqué' };

    const resultPromise = firstValueFrom(gateway.revoke('token-1'));
    httpController
      .expectOne({ method: 'DELETE', url: `${API_URL}/api-tokens/token-1` })
      .flush(expected);

    expect(await resultPromise).toEqual(expected);
  });
});
