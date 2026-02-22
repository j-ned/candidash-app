import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { AuthGateway } from '../gateways/auth.gateway';
import type { ResetPasswordRequest, ResetPasswordResponse } from '../models/auth.model';

describe('ResetPasswordUseCase', () => {
  it.each([
    {
      request: { token: 'token-abc', newPassword: 'NewPass123!' } as ResetPasswordRequest,
      expected: { message: 'Password reset successful' } as ResetPasswordResponse,
    },
    {
      request: { token: 'token-xyz', newPassword: 'Secret789!' } as ResetPasswordRequest,
      expected: { message: 'Password updated' } as ResetPasswordResponse,
    },
  ])('should call gateway.resetPassword with token $request.token', ({ request, expected }) => {
    // Given
    const gateway = {
      resetPassword: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [ResetPasswordUseCase, { provide: AuthGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(ResetPasswordUseCase);

    // When
    let result: ResetPasswordResponse | undefined;
    useCase.execute(request).subscribe((res) => (result = res));

    // Then
    expect(gateway.resetPassword).toHaveBeenCalledWith(request);
    expect(result).toEqual(expected);
  });
});
