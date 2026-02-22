import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { API_BASE_URL } from '@core/services/config';
import { AuthGateway } from '@features/auth/domain/gateways/auth.gateway';
import { HttpAuthGateway } from '@features/auth/infra/http-auth.gateway';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import { HttpJobtrackGateway } from '@features/jobtrack/infra/http-jobtrack.gateway';
import { ProfileGateway } from '@features/profile/domain/gateways/profile.gateway';
import { HttpProfileGateway } from '@features/profile/infra/http-profile.gateway';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/api/v1' },
        { provide: AuthGateway, useClass: HttpAuthGateway },
        { provide: JobtrackGateway, useClass: HttpJobtrackGateway },
        { provide: ProfileGateway, useClass: HttpProfileGateway },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
