import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Signin } from './signin';
import { AuthState } from '@features/auth/application/auth-state';
import { ForgotPasswordModal } from '@shared/ui/forgot-password-modal/service/forgot-password-modal';

describe('Signin', () => {
  let authState: {
    isLoading: ReturnType<typeof signal<boolean>>;
    hasPending2FA: ReturnType<typeof signal<boolean>>;
    signin: ReturnType<typeof vi.fn>;
    validateTotp: ReturnType<typeof vi.fn>;
    useRecoveryCode: ReturnType<typeof vi.fn>;
    clearPending2FA: ReturnType<typeof vi.fn>;
  };
  let forgotPasswordModal: { showForgotPasswordModal: ReturnType<typeof vi.fn> };

  function setup(): ComponentFixture<Signin> {
    authState = {
      isLoading: signal(false),
      hasPending2FA: signal(false),
      signin: vi.fn().mockReturnValue(of({ user: {} })),
      validateTotp: vi.fn().mockReturnValue(of({ user: {} })),
      useRecoveryCode: vi.fn().mockReturnValue(of({ user: {} })),
      clearPending2FA: vi.fn(),
    };
    forgotPasswordModal = {
      showForgotPasswordModal: vi.fn().mockResolvedValue({ action: 'cancelled' }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthState, useValue: authState },
        { provide: ForgotPasswordModal, useValue: forgotPasswordModal },
      ],
    });
    const fixture = TestBed.createComponent(Signin);
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(fixture: ComponentFixture<Signin>, id: string): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<Signin>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  async function submit(fixture: ComponentFixture<Signin>, formId: string): Promise<void> {
    byTestId<HTMLFormElement>(fixture, formId).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function click(fixture: ComponentFixture<Signin>, id: string): void {
    byTestId<HTMLButtonElement>(fixture, id).click();
    fixture.detectChanges();
  }

  function innerButton(fixture: ComponentFixture<Signin>, id: string): HTMLButtonElement {
    return byTestId(fixture, id).querySelector('button') as HTMLButtonElement;
  }

  function openTwoFactor(fixture: ComponentFixture<Signin>): void {
    authState.hasPending2FA.set(true);
    fixture.detectChanges();
  }

  describe('credentials', () => {
    it.each([
      ['signin-email', '', "L'email est requis"],
      ['signin-email', 'pas-un-email', 'Veuillez entrer un email valide'],
      ['signin-password', '', 'Le mot de passe est requis'],
      ['signin-password', 'abc', 'Le mot de passe doit contenir au moins 6 caractères'],
    ])('flags %s = "%s" once the field is left', (id, value, expected) => {
      // Given
      const fixture = setup();

      // When
      type(fixture, id, value);

      // Then
      expect(byTestId(fixture, `${id}-error`).textContent).toContain(expected);
    });

    it('signs in with the typed credentials', async () => {
      // Given
      const fixture = setup();
      type(fixture, 'signin-email', 'camille@example.com');
      type(fixture, 'signin-password', 'secret123');

      // When
      await submit(fixture, 'signin-form');

      // Then
      expect(authState.signin).toHaveBeenCalledTimes(1);
      expect(authState.signin).toHaveBeenCalledWith({
        email: 'camille@example.com',
        password: 'secret123',
      });
    });

    it('reveals every error and signs nothing in when the form is invalid', async () => {
      // Given
      const fixture = setup();

      // When
      await submit(fixture, 'signin-form');

      // Then
      expect(authState.signin).not.toHaveBeenCalled();
      expect(byTestId(fixture, 'signin-email-error')).not.toBeNull();
      expect(byTestId(fixture, 'signin-password-error')).not.toBeNull();
      expect(byTestId(fixture, 'signin-email').getAttribute('aria-invalid')).toBe('true');
    });

    it('keeps the button enabled while invalid, disabled only while loading', () => {
      // Given
      const fixture = setup();
      expect(innerButton(fixture, 'signin-submit').disabled).toBe(false);

      // When
      authState.isLoading.set(true);
      fixture.detectChanges();

      // Then
      expect(innerButton(fixture, 'signin-submit').disabled).toBe(true);
    });

    it('toggles the password visibility', () => {
      // Given
      const fixture = setup();
      expect(byTestId<HTMLInputElement>(fixture, 'signin-password').type).toBe('password');

      // When
      click(fixture, 'signin-password-toggle');

      // Then
      expect(byTestId<HTMLInputElement>(fixture, 'signin-password').type).toBe('text');
    });

    it('opens the forgot-password modal with the typed email', async () => {
      // Given
      const fixture = setup();
      type(fixture, 'signin-email', 'camille@example.com');

      // When
      click(fixture, 'signin-forgot-password');
      await fixture.whenStable();

      // Then
      expect(forgotPasswordModal.showForgotPasswordModal).toHaveBeenCalledWith({
        email: 'camille@example.com',
      });
    });
  });

  describe('two-factor modal', () => {
    it('validates a 6-digit TOTP code', async () => {
      // Given
      const fixture = setup();
      openTwoFactor(fixture);
      type(fixture, 'totp-token', '123456');

      // When
      await submit(fixture, 'totp-form');

      // Then
      expect(authState.validateTotp).toHaveBeenCalledTimes(1);
      expect(authState.validateTotp).toHaveBeenCalledWith('123456');
    });

    it.each([
      ['', 'Le code est requis'],
      ['12ab', 'Le code doit contenir exactement 6 chiffres'],
    ])('flags the TOTP code "%s" once the field is left', (value, expected) => {
      // Given
      const fixture = setup();
      openTwoFactor(fixture);

      // When
      type(fixture, 'totp-token', value);

      // Then
      expect(byTestId(fixture, 'totp-token-error').textContent).toContain(expected);
    });

    it('reveals the error and validates nothing when the TOTP code is missing', async () => {
      // Given
      const fixture = setup();
      openTwoFactor(fixture);

      // When
      await submit(fixture, 'totp-form');

      // Then
      expect(authState.validateTotp).not.toHaveBeenCalled();
      expect(byTestId(fixture, 'totp-token-error')).not.toBeNull();
      expect(innerButton(fixture, 'totp-submit').disabled).toBe(false);
    });

    it('uses a recovery code', async () => {
      // Given
      const fixture = setup();
      openTwoFactor(fixture);
      click(fixture, 'totp-toggle-recovery');
      type(fixture, 'recovery-code', 'abcd-efgh-ijkl');

      // When
      await submit(fixture, 'recovery-form');

      // Then
      expect(authState.useRecoveryCode).toHaveBeenCalledTimes(1);
      expect(authState.useRecoveryCode).toHaveBeenCalledWith('abcd-efgh-ijkl');
    });

    it('flags a missing recovery code once the field is left', () => {
      // Given
      const fixture = setup();
      openTwoFactor(fixture);
      click(fixture, 'totp-toggle-recovery');

      // When
      type(fixture, 'recovery-code', '');

      // Then
      expect(byTestId(fixture, 'recovery-code-error').textContent).toContain(
        'Le code de récupération est requis',
      );
    });

    it('reveals the error and sends nothing when the recovery code is missing', async () => {
      // Given
      const fixture = setup();
      openTwoFactor(fixture);
      click(fixture, 'totp-toggle-recovery');

      // When
      await submit(fixture, 'recovery-form');

      // Then
      expect(authState.useRecoveryCode).not.toHaveBeenCalled();
      expect(byTestId(fixture, 'recovery-code-error')).not.toBeNull();
    });

    it('drops the pending 2FA and empties the code on cancel', () => {
      // Given
      const fixture = setup();
      openTwoFactor(fixture);
      type(fixture, 'totp-token', '12');

      // When
      click(fixture, 'totp-cancel');
      openTwoFactor(fixture);

      // Then
      expect(authState.clearPending2FA).toHaveBeenCalledTimes(1);
      expect(byTestId<HTMLInputElement>(fixture, 'totp-token').value).toBe('');
      expect(byTestId(fixture, 'totp-token-error')).toBeNull();
    });
  });
});
