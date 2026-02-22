import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { SignupUseCase } from './signup.use-case';
import { AuthGateway } from '../gateways/auth.gateway';
import type { RegisterData, RegistrationResponse } from '../models/auth.model';

describe('SignupUseCase', () => {
  it.each([
    {
      data: { email: 'john@example.com', password: 'Pass123!', username: 'john' } as RegisterData,
      expected: { message: 'Registration successful', email: 'john@example.com' } as RegistrationResponse,
    },
    {
      data: { email: 'jane@example.com', password: 'Secret456!' } as RegisterData,
      expected: { message: 'Registration successful', email: 'jane@example.com' } as RegistrationResponse,
    },
  ])('should call gateway.signup with $data.email', ({ data, expected }) => {
    // Given
    const gateway = {
      signup: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [SignupUseCase, { provide: AuthGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(SignupUseCase);

    // When
    let result: RegistrationResponse | undefined;
    useCase.execute(data).subscribe((res) => (result = res));

    // Then
    expect(gateway.signup).toHaveBeenCalledWith(data);
    expect(result).toEqual(expected);
  });
});
