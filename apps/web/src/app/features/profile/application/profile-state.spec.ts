import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { of, firstValueFrom } from 'rxjs';
import { ProfileState } from './profile-state';
import { ProfileGateway } from '../domain/gateways/profile.gateway';
import { AuthState } from '@features/auth/application/auth-state';
import { Toaster } from '@shared/ui/toast/service/toast';
import type { User } from '../domain/models/profile.model';

const user: User = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'tester',
  role: 'USER',
  totpEnabled: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const PROFILE_URL = 'http://api/accounts/profile/user-1';
const profileApi = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'tester',
  role: 'USER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('ProfileState', () => {
  let state: ProfileState;
  let gateway: {
    getProfileUrl: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
  };
  let http: HttpTestingController;
  const toast = { show: vi.fn() };

  beforeEach(() => {
    gateway = {
      getProfileUrl: vi.fn(() => PROFILE_URL),
      updateProfile: vi.fn(() =>
        of({ ...user, username: 'updated' }),
      ),
      changePassword: vi.fn(() => of({ message: 'Mot de passe modifié' })),
      deleteAccount: vi.fn(() => of({ message: 'Compte supprimé' })),
    };
    TestBed.configureTestingModule({
      providers: [
        ProfileState,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProfileGateway, useValue: gateway },
        { provide: Toaster, useValue: toast },
        {
          provide: AuthState,
          useValue: {
            user: () => user,
            isAuthenticated: () => true,
            updateUserData: vi.fn(),
          },
        },
      ],
    });
    state = TestBed.inject(ProfileState);
    http = TestBed.inject(HttpTestingController);
  });

  function flushPending(): void {
    http.match(() => true).forEach((r) => r.flush(profileApi));
  }

  it('Given an authenticated user, When the resource loads, Then it exposes the profile with Date fields', () => {
    // When: the httpResource fires the GET reactively
    TestBed.tick();
    const req = http.expectOne(PROFILE_URL);
    req.flush(profileApi);
    TestBed.tick();

    // Then: dates are converted by the adapter (string ISO → Date)
    expect(state.profile()?.id).toBe('user-1');
    expect(state.profile()?.createdAt).toBeInstanceOf(Date);
  });

  it('Given the user before load, When profile() is read, Then it falls back to a shell from the user', () => {
    // Then: shell available immediately (before HTTP flush)
    expect(state.profile()?.email).toBe('test@example.com');
    flushPending();
  });

  it('Given valid data, When updateProfile succeeds, Then it notifies and reloads', async () => {
    TestBed.tick();
    flushPending(); // flush initial GET

    await firstValueFrom(state.updateProfile({ username: 'updated' }));

    expect(gateway.updateProfile).toHaveBeenCalledWith('user-1', {
      username: 'updated',
    });
    expect(toast.show).toHaveBeenCalled();
    flushPending(); // flush the reload GET
  });
});
