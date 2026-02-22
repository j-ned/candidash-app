import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { DeleteAccountUseCase } from './delete-account.use-case';
import { ProfileGateway } from '../gateways/profile.gateway';

describe('DeleteAccountUseCase', () => {
  it.each([
    { userId: 'user-1', expected: { message: 'Account deactivated' } },
    { userId: 'user-2', expected: { message: 'Account deleted' } },
  ])('should call gateway.deleteAccount with userId $userId', ({ userId, expected }) => {
    // Given
    const gateway = {
      deleteAccount: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [DeleteAccountUseCase, { provide: ProfileGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(DeleteAccountUseCase);

    // When
    let result: { message: string } | undefined;
    useCase.execute(userId).subscribe((res) => (result = res));

    // Then
    expect(gateway.deleteAccount).toHaveBeenCalledWith(userId);
    expect(result).toEqual(expected);
  });
});
