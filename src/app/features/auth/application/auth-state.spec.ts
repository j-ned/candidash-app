import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, firstValueFrom, defer } from 'rxjs';
import { AuthState } from './auth-state';
import { AuthGateway } from '../domain/gateways/auth.gateway';
import { TokenStore } from '@core/services/token';
import { Toaster } from '@shared/ui/toast/service/toast';
import type {
  AuthResponse,
  LoginResponse,
  User,
} from '../domain/models/auth.model';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    username: 'tester',
    role: 'USER',
    totpEnabled: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

const authResponse: AuthResponse = {
  user: buildUser(),
};

type GatewayStub = {
  signin: ReturnType<typeof vi.fn>;
  signout: ReturnType<typeof vi.fn>;
};

describe('AuthState', () => {
  let state: AuthState;
  let gateway: GatewayStub;
  let router: { navigate: ReturnType<typeof vi.fn>; url: string };
  let toaster: { show: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    gateway = {
      signin: vi.fn(() => of<LoginResponse>(authResponse)),
      signout: vi.fn(() => of(undefined)),
    };
    router = { navigate: vi.fn(), url: '/auth/signin' };
    toaster = { show: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthState,
        { provide: AuthGateway, useValue: gateway },
        { provide: Router, useValue: router },
        { provide: Toaster, useValue: toaster },
        {
          provide: TokenStore,
          useValue: { hasValidRefreshToken: () => false },
        },
      ],
    });
    state = TestBed.inject(AuthState);
  });

  it('Given valid credentials, When signin succeeds, Then it authenticates and navigates to dashboard', async () => {
    // When
    await firstValueFrom(
      state.signin({ email: 'test@example.com', password: 'secret' }),
    );

    // Then
    expect(state.isAuthenticated()).toBe(true);
    expect(state.user()?.email).toBe('test@example.com');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(localStorage.getItem('auth_user')).toContain('test@example.com');
  });

  it('Given a 2FA-enabled account, When signin returns requires2FA, Then it stores the temp token without navigating', async () => {
    // Given
    gateway.signin.mockReturnValue(
      of<LoginResponse>({
        requires2FA: true,
        tempToken: 'temp-123',
        message: '2FA required',
      }),
    );

    // When
    await firstValueFrom(
      state.signin({ email: 'test@example.com', password: 'secret' }),
    );

    // Then
    expect(state.hasPending2FA()).toBe(true);
    expect(state.isAuthenticated()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('Given the server rejects, When signin fails, Then it surfaces the error and stays unauthenticated', async () => {
    // Given
    gateway.signin.mockReturnValue(
      defer(() => throwError(() => ({ status: 401 }))),
    );

    // When / Then
    await expect(
      firstValueFrom(
        state.signin({ email: 'test@example.com', password: 'bad' }),
      ),
    ).rejects.toBeDefined();
    expect(state.isAuthenticated()).toBe(false);
    expect(state.error()).toBe('Identifiants invalides');
  });

  it('Given an authenticated session, When signout is called, Then it clears auth data', async () => {
    // Given
    localStorage.setItem('auth_user', JSON.stringify(buildUser()));

    // When
    await firstValueFrom(state.signout());

    // Then
    expect(state.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(gateway.signout).toHaveBeenCalled();
  });
});
