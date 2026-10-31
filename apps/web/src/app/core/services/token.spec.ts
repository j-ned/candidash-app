import { TestBed } from '@angular/core/testing';
import { TokenStore } from './token';

describe('TokenStore', () => {
  let service: TokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TokenStore],
    });
    service = TestBed.inject(TokenStore);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return true when auth_user is present in localStorage', () => {
    // Given
    localStorage.setItem('auth_user', JSON.stringify({ id: 'user-1', email: 'test@test.com' }));

    // When
    const result = service.hasValidRefreshToken();

    // Then
    expect(result).toBe(true);
  });

  it('should return false when auth_user is not in localStorage', () => {
    // Given — localStorage is empty

    // When
    const result = service.hasValidRefreshToken();

    // Then
    expect(result).toBe(false);
  });

  it('should return false when auth_user is "undefined"', () => {
    // Given
    localStorage.setItem('auth_user', 'undefined');

    // When
    const result = service.hasValidRefreshToken();

    // Then
    expect(result).toBe(false);
  });
});
