import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { ChangePasswordUseCase } from './change-password.use-case';
import { ProfileGateway } from '../gateways/profile.gateway';
import type { ChangePasswordRequest } from '../models/profile.model';

describe('ChangePasswordUseCase', () => {
  it('should call gateway.changePassword with request data', () => {
    // Given
    const data: ChangePasswordRequest = { currentPassword: 'OldPass123!', newPassword: 'NewPass456!' };
    const expected = { message: 'Password changed successfully' };
    const gateway = {
      changePassword: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [ChangePasswordUseCase, { provide: ProfileGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(ChangePasswordUseCase);

    // When
    let result: { message: string } | undefined;
    useCase.execute(data).subscribe((res) => (result = res));

    // Then
    expect(gateway.changePassword).toHaveBeenCalledWith(data);
    expect(result).toEqual(expected);
  });
});
