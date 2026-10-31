import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { HttpProfileGateway } from './http-profile.gateway';
import { Config } from '@core/services/config';
import { ProfileBuilder } from '../test-utils/profile.builder';
import type { ChangePasswordRequest, UpdateProfileRequest } from '../domain/models/profile.model';

const API_URL = 'http://localhost:3000/api/v1';

describe('HttpProfileGateway', () => {
  let gateway: HttpProfileGateway;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpProfileGateway,
        { provide: Config, useValue: { apiUrl: API_URL } },
      ],
    });
    gateway = TestBed.inject(HttpProfileGateway);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('should build the GET /accounts/profile/:userId URL (consommée par httpResource)', () => {
    // When / Then
    expect(gateway.getProfileUrl('user-1')).toBe(
      `${API_URL}/accounts/profile/user-1`,
    );
  });

  it('should PUT /accounts/profile-update/:userId', async () => {
    // Given
    const data: UpdateProfileRequest = { username: 'updated-name' };
    const expected = ProfileBuilder.default().with('username', 'updated-name').build();

    // When
    const resultPromise = firstValueFrom(gateway.updateProfile('user-1', data));
    httpController
      .expectOne({ method: 'PUT', url: `${API_URL}/accounts/profile-update/user-1` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should PUT /accounts/change-password', async () => {
    // Given
    const data: ChangePasswordRequest = { currentPassword: 'OldPass!', newPassword: 'NewPass!' };
    const expected = { message: 'Password changed' };

    // When
    const resultPromise = firstValueFrom(gateway.changePassword(data));
    httpController
      .expectOne({ method: 'PUT', url: `${API_URL}/accounts/change-password` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });

  it('should DELETE /accounts/deactivation/:userId', async () => {
    // Given
    const expected = { message: 'Account deactivated' };

    // When
    const resultPromise = firstValueFrom(gateway.deleteAccount('user-1'));
    httpController
      .expectOne({ method: 'DELETE', url: `${API_URL}/accounts/deactivation/user-1` })
      .flush(expected);

    // Then
    expect(await resultPromise).toEqual(expected);
  });
});
