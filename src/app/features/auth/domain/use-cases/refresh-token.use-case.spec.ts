import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { AuthGateway } from '../gateways/auth.gateway';
import type { RefreshResponse } from '../models/auth.model';

describe('RefreshTokenUseCase', () => {
  it('should call gateway.refreshToken and return response', () => {
    // Given
    const expected: RefreshResponse = { access_token: 'new-jwt-token' };
    const gateway = {
      refreshToken: vi.fn().mockReturnValue(defer(() => of(expected))),
    };
    TestBed.configureTestingModule({
      providers: [RefreshTokenUseCase, { provide: AuthGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(RefreshTokenUseCase);

    // When
    let result: RefreshResponse | undefined;
    useCase.execute().subscribe((res) => (result = res));

    // Then
    expect(gateway.refreshToken).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });
});
