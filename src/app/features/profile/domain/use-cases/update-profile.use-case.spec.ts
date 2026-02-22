import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { UpdateProfileUseCase } from './update-profile.use-case';
import { ProfileGateway } from '../gateways/profile.gateway';
import { ProfileBuilder } from '../../test-utils/profile.builder';
import type { ProfileData, UpdateProfileRequest } from '../models/profile.model';

describe('UpdateProfileUseCase', () => {
  it.each([
    {
      userId: 'user-1',
      data: { username: 'john-updated' } as UpdateProfileRequest,
      expected: ProfileBuilder.default().with('username', 'john-updated').build(),
    },
    {
      userId: 'user-2',
      data: { email: 'new@example.com' } as UpdateProfileRequest,
      expected: ProfileBuilder.default().with('id', 'user-2').with('email', 'new@example.com').build(),
    },
  ])('should call gateway.updateProfile for userId $userId', ({ userId, data, expected }) => {
    // Given
    const gateway = {
      updateProfile: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [UpdateProfileUseCase, { provide: ProfileGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(UpdateProfileUseCase);

    // When
    let result: ProfileData | undefined;
    useCase.execute(userId, data).subscribe((res) => (result = res));

    // Then
    expect(gateway.updateProfile).toHaveBeenCalledWith(userId, data);
    expect(result).toEqual(expected);
  });
});
