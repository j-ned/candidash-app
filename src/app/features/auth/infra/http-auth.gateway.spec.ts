import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { HttpAuthGateway } from './http-auth.gateway';
import { Config } from '@core/services/config';
import { AuthResponseBuilder } from '../test-utils/auth-response.builder';
import { UserBuilder } from '../test-utils/user.builder';
import type {
  ForgotPasswordRequest,
  LoginCredentials,
  RegisterData,
  ResetPasswordRequest,
  VerifyRegistrationRequest,
} from '../domain/models/auth.model';

const API_URL = 'http://localhost:3000/api/v1';

describe('HttpAuthGateway', () => {
  let gateway: HttpAuthGateway;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpAuthGateway,
        { provide: Config, useValue: { apiUrl: API_URL } },
      ],
    });
    gateway = TestBed.inject(HttpAuthGateway);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('should POST /auth/login with credentials', async () => {
    // Given
    const credentials: LoginCredentials = { email: 'test@test.com', password: 'pass123' };
    const expected = AuthResponseBuilder.default().build();

    // When
    const resultPromise = firstValueFrom(gateway.signin(credentials));
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/auth/login` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should POST /auth/register with register data', async () => {
    // Given
    const data: RegisterData = { email: 'new@test.com', password: 'pass123', username: 'newuser' };
    const expected = { message: 'Registration successful', email: 'new@test.com' };

    // When
    const resultPromise = firstValueFrom(gateway.signup(data));
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/auth/register` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should POST /auth/verify-registration with verification data', async () => {
    // Given
    const data: VerifyRegistrationRequest = { email: 'test@test.com', verificationCode: '123456' };
    const expected = AuthResponseBuilder.default()
      .with('user', UserBuilder.default().with('email', 'test@test.com').build())
      .build();

    // When
    const resultPromise = firstValueFrom(gateway.verifyRegistration(data));
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/auth/verify-registration` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should POST /auth/resend-verification with email', async () => {
    // Given
    const email = 'test@test.com';
    const expected = { message: 'Code resent' };

    // When
    const resultPromise = firstValueFrom(gateway.resendVerificationCode(email));
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/auth/resend-verification` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should POST /accounts/forgot-password with request', async () => {
    // Given
    const request: ForgotPasswordRequest = { email: 'test@test.com' };
    const expected = { message: 'Reset email sent' };

    // When
    const resultPromise = firstValueFrom(gateway.forgotPassword(request));
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/accounts/forgot-password` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should POST /accounts/reset-password with request', async () => {
    // Given
    const request: ResetPasswordRequest = { token: 'reset-token', newPassword: 'NewPass123!' };
    const expected = { message: 'Password reset successful' };

    // When
    const resultPromise = firstValueFrom(gateway.resetPassword(request));
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/accounts/reset-password` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should POST /auth/logout', async () => {
    // Given / When
    const resultPromise = firstValueFrom(gateway.signout());
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/auth/logout` })
      .flush(null);

    // Then
    await resultPromise;
  });

  it('should POST /auth/refresh', async () => {
    // Given
    const expected = { access_token: 'new-jwt-token' };

    // When
    const resultPromise = firstValueFrom(gateway.refreshToken());
    httpController
      .expectOne({ method: 'POST', url: `${API_URL}/auth/refresh` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });
});
