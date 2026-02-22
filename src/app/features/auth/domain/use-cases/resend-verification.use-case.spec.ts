import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { ResendVerificationUseCase } from './resend-verification.use-case';
import { AuthGateway } from '../gateways/auth.gateway';

describe('ResendVerificationUseCase', () => {
  it.each([
    { email: 'john@example.com', expected: { message: 'Code resent' } },
    { email: 'jane@example.com', expected: { message: 'Verification code sent' } },
  ])('should call gateway.resendVerificationCode with $email', ({ email, expected }) => {
    // Given
    const gateway = {
      resendVerificationCode: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [ResendVerificationUseCase, { provide: AuthGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(ResendVerificationUseCase);

    // When
    let result: { message: string } | undefined;
    useCase.execute(email).subscribe((res) => (result = res));

    // Then
    expect(gateway.resendVerificationCode).toHaveBeenCalledWith(email);
    expect(result).toEqual(expected);
  });
});
