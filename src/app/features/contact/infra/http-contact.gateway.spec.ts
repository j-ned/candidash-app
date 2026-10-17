import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { Config } from '@core/services/config';
import { HttpContactGateway } from './http-contact.gateway';
import type { ContactMessage } from '../domain/models/contact-message.model';

describe('HttpContactGateway', () => {
  const API_URL = 'https://api.example.test/api/v1';
  let gateway: HttpContactGateway;
  let httpController: HttpTestingController;

  const message: ContactMessage = {
    name: 'Camille',
    email: 'camille@example.com',
    subject: 'Question',
    message: 'Bonjour, une question.',
    website: '',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Config, useValue: { apiUrl: API_URL } },
      ],
    });
    gateway = TestBed.inject(HttpContactGateway);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('posts the message to /contact', async () => {
    // Given / When
    const sent = firstValueFrom(gateway.send(message));
    const req = httpController.expectOne(`${API_URL}/contact`);
    req.flush(null, { status: 204, statusText: 'No Content' });
    await sent;

    // Then
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(message);
  });
});
