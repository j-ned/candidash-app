import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { SigninUseCase } from './signin.use-case';
import { AuthGateway } from '../gateways/auth.gateway';
import { AuthResponseBuilder } from '../../test-utils/auth-response.builder';
import { UserBuilder } from '../../test-utils/user.builder';
import type { AuthResponse, LoginCredentials } from '../models/auth.model';

describe('SigninUseCase', () => {
  it.each([
    {
      credentials: { email: 'john@example.com', password: 'Pass123!' } as LoginCredentials,
      expected: AuthResponseBuilder.default().build(),
    },
    {
      credentials: { email: 'jane@example.com', password: 'Secret456!' } as LoginCredentials,
      expected: AuthResponseBuilder.default()
        .with('user', UserBuilder.default().with('email', 'jane@example.com').build())
        .build(),
    },
  ])('should call gateway.signin with $credentials.email', ({ credentials, expected }) => {
    // Given
    const gateway = {
      signin: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [SigninUseCase, { provide: AuthGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(SigninUseCase);

    // When
    let result: AuthResponse | undefined;
    useCase.execute(credentials).subscribe((res) => (result = res));

    // Then
    expect(gateway.signin).toHaveBeenCalledWith(credentials);
    expect(result).toEqual(expected);
  });
});
