import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { GetProfileUseCase } from './get-profile.use-case';
import { ProfileGateway } from '../gateways/profile.gateway';
import { ProfileBuilder } from '../../test-utils/profile.builder';
import type { ProfileData } from '../models/profile.model';

describe('GetProfileUseCase', () => {
  it.each([
    { userId: 'user-1', expected: ProfileBuilder.default().build() },
    { userId: 'user-2', expected: ProfileBuilder.default().with('id', 'user-2').with('email', 'jane@example.com').build() },
  ])('should call gateway.getProfile with userId $userId', ({ userId, expected }) => {
    // Given
    const gateway = {
      getProfile: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [GetProfileUseCase, { provide: ProfileGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(GetProfileUseCase);

    // When
    let result: ProfileData | undefined;
    useCase.execute(userId).subscribe((res) => (result = res));

    // Then
    expect(gateway.getProfile).toHaveBeenCalledWith(userId);
    expect(result).toEqual(expected);
  });
});
