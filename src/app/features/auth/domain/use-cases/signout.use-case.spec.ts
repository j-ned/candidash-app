import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { SignoutUseCase } from './signout.use-case';
import { AuthGateway } from '../gateways/auth.gateway';

describe('SignoutUseCase', () => {
  it('should call gateway.signout', () => {
    // Given
    const gateway = {
      signout: vi.fn().mockReturnValue(defer(() => of(undefined))),
    };
    TestBed.configureTestingModule({
      providers: [SignoutUseCase, { provide: AuthGateway, useValue: gateway }],
    });
    const useCase = TestBed.inject(SignoutUseCase);

    // When
    let completed = false;
    useCase.execute().subscribe({ complete: () => (completed = true) });

    // Then
    expect(gateway.signout).toHaveBeenCalled();
    expect(completed).toBe(true);
  });
});
