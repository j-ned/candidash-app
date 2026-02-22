import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { ForgotPasswordUseCase } from './forgot-password.use-case';
import { AuthGateway } from '../gateways/auth.gateway';
import type { ForgotPasswordRequest, ForgotPasswordResponse } from '../models/auth.model';

describe('ForgotPasswordUseCase', () => {
  it.each([
    {
      request: { email: 'john@example.com' } as ForgotPasswordRequest,
      expected: { message: 'Reset email sent' } as ForgotPasswordResponse,
    },
    {
      request: { email: 'jane@example.com' } as ForgotPasswordRequest,
      expected: { message: 'Password reset link sent' } as ForgotPasswordResponse,
    },
  ])('should call gateway.forgotPassword with $request.email', ({ request, expected }) => {
    // Given
    const gateway = {
      forgotPassword: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [ForgotPasswordUseCase, { provide: AuthGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(ForgotPasswordUseCase);

    // When
    let result: ForgotPasswordResponse | undefined;
    useCase.execute(request).subscribe((res) => (result = res));

    // Then
    expect(gateway.forgotPassword).toHaveBeenCalledWith(request);
    expect(result).toEqual(expected);
  });
});
