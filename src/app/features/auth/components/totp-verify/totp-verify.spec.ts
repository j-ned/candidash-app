import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TotpVerify } from './totp-verify';
import { AuthState } from '@features/auth/application/auth-state';

describe('TotpVerify', () => {
  let authState: {
    isLoading: ReturnType<typeof signal<boolean>>;
    hasPending2FA: ReturnType<typeof signal<boolean>>;
    validateTotp: ReturnType<typeof vi.fn>;
    useRecoveryCode: ReturnType<typeof vi.fn>;
    clearPending2FA: ReturnType<typeof vi.fn>;
  };
  let navigate: ReturnType<typeof vi.spyOn>;

  function setup(pending2FA = true): ComponentFixture<TotpVerify> {
    authState = {
      isLoading: signal(false),
      hasPending2FA: signal(pending2FA),
      validateTotp: vi.fn().mockReturnValue(of({ user: {} })),
      useRecoveryCode: vi.fn().mockReturnValue(of({ user: {} })),
      clearPending2FA: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthState, useValue: authState }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(TotpVerify);
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(fixture: ComponentFixture<TotpVerify>, id: string): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<TotpVerify>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  async function submit(fixture: ComponentFixture<TotpVerify>, formId: string): Promise<void> {
    byTestId<HTMLFormElement>(fixture, formId).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function click(fixture: ComponentFixture<TotpVerify>, id: string): void {
    byTestId<HTMLButtonElement>(fixture, id).click();
    fixture.detectChanges();
  }

  function innerButton(fixture: ComponentFixture<TotpVerify>, id: string): HTMLButtonElement {
    return byTestId(fixture, id).querySelector('button') as HTMLButtonElement;
  }

  it('sends back to sign-in when no 2FA is pending', () => {
    // Given / When
    setup(false);

    // Then
    expect(navigate).toHaveBeenCalledWith(['/auth/signin']);
  });

  describe('TOTP code', () => {
    it('stops typing at 6 characters', () => {
      // Given / When
      const fixture = setup();

      // Then
      expect(byTestId(fixture, 'totp-token').getAttribute('maxlength')).toBe('6');
    });

    it.each([
      ['', 'Le code est requis'],
      ['12ab', 'Le code doit contenir exactement 6 chiffres'],
    ])('flags the code "%s" once the field is left', (value, expected) => {
      // Given
      const fixture = setup();

      // When
      type(fixture, 'totp-token', value);

      // Then
      expect(byTestId(fixture, 'totp-token-error').textContent).toContain(expected);
    });

    it('validates a 6-digit code', async () => {
      // Given
      const fixture = setup();
      type(fixture, 'totp-token', '123456');

      // When
      await submit(fixture, 'totp-form');

      // Then
      expect(authState.validateTotp).toHaveBeenCalledTimes(1);
      expect(authState.validateTotp).toHaveBeenCalledWith('123456');
    });

    it('reveals the error and validates nothing when the code is missing', async () => {
      // Given
      const fixture = setup();

      // When
      await submit(fixture, 'totp-form');

      // Then
      expect(authState.validateTotp).not.toHaveBeenCalled();
      expect(byTestId(fixture, 'totp-token-error').textContent).toContain('Le code est requis');
      expect(byTestId(fixture, 'totp-token').getAttribute('aria-invalid')).toBe('true');
    });

    it('keeps the button enabled while invalid, disabled only while loading', () => {
      // Given
      const fixture = setup();
      expect(innerButton(fixture, 'totp-submit').disabled).toBe(false);

      // When
      authState.isLoading.set(true);
      fixture.detectChanges();

      // Then
      expect(innerButton(fixture, 'totp-submit').disabled).toBe(true);
    });
  });

  describe('recovery code', () => {
    it('flags a missing recovery code once the field is left', () => {
      // Given
      const fixture = setup();
      click(fixture, 'totp-toggle-recovery');

      // When
      type(fixture, 'recovery-code', '');

      // Then
      expect(byTestId(fixture, 'recovery-code-error').textContent).toContain(
        'Le code de récupération est requis',
      );
    });

    it('uses the recovery code', async () => {
      // Given
      const fixture = setup();
      click(fixture, 'totp-toggle-recovery');
      type(fixture, 'recovery-code', 'abcd-efgh-ijkl');

      // When
      await submit(fixture, 'recovery-form');

      // Then
      expect(authState.useRecoveryCode).toHaveBeenCalledTimes(1);
      expect(authState.useRecoveryCode).toHaveBeenCalledWith('abcd-efgh-ijkl');
    });

    it('reveals the error and sends nothing when the code is missing', async () => {
      // Given
      const fixture = setup();
      click(fixture, 'totp-toggle-recovery');

      // When
      await submit(fixture, 'recovery-form');

      // Then
      expect(authState.useRecoveryCode).not.toHaveBeenCalled();
      expect(byTestId(fixture, 'recovery-code-error')).not.toBeNull();
      expect(innerButton(fixture, 'recovery-submit').disabled).toBe(false);
    });
  });

  it('empties the code when switching modes', () => {
    // Given
    const fixture = setup();
    type(fixture, 'totp-token', '12');

    // When
    click(fixture, 'totp-toggle-recovery');
    click(fixture, 'totp-toggle-recovery');

    // Then
    expect(byTestId<HTMLInputElement>(fixture, 'totp-token').value).toBe('');
    expect(byTestId(fixture, 'totp-token-error')).toBeNull();
  });

  it('drops the pending 2FA and goes back to sign-in', () => {
    // Given
    const fixture = setup();

    // When
    click(fixture, 'totp-back');

    // Then
    expect(authState.clearPending2FA).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/auth/signin']);
  });
});
