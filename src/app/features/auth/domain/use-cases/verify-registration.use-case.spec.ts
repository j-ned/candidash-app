import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { VerifyRegistrationUseCase } from './verify-registration.use-case';
import { AuthGateway } from '../gateways/auth.gateway';
import { AuthResponseBuilder } from '../../test-utils/auth-response.builder';
import { UserBuilder } from '../../test-utils/user.builder';
import type { AuthResponse, VerifyRegistrationRequest } from '../models/auth.model';

describe('VerifyRegistrationUseCase', () => {
  it.each([
    {
      data: { email: 'john@example.com', verificationCode: '123456' } as VerifyRegistrationRequest,
      expected: AuthResponseBuilder.default().build(),
    },
    {
      data: { email: 'jane@example.com', verificationCode: '654321' } as VerifyRegistrationRequest,
      expected: AuthResponseBuilder.default()
        .with('user', UserBuilder.default().with('email', 'jane@example.com').build())
        .build(),
    },
  ])('should call gateway.verifyRegistration with code $data.verificationCode', ({ data, expected }) => {
    // Given
    const gateway = {
      verifyRegistration: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [VerifyRegistrationUseCase, { provide: AuthGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(VerifyRegistrationUseCase);

    // When
    let result: AuthResponse | undefined;
    useCase.execute(data).subscribe((res) => (result = res));

    // Then
    expect(gateway.verifyRegistration).toHaveBeenCalledWith(data);
    expect(result).toEqual(expected);
  });
});
