import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Profile2fa } from './profile-2fa';
import { AuthState } from '@features/auth/application/auth-state';
import { AuthGateway } from '@features/auth/domain/gateways/auth.gateway';
import { Toaster } from '@shared/ui/toast/service/toast';
import { ProfileBuilder } from '@features/profile/test-utils/profile.builder';

describe('Profile2fa', () => {
  let gateway: {
    setupTotp: ReturnType<typeof vi.fn>;
    verifyTotpSetup: ReturnType<typeof vi.fn>;
    disableTotp: ReturnType<typeof vi.fn>;
  };
  let authState: { user: ReturnType<typeof signal>; updateUserData: ReturnType<typeof vi.fn> };
  let toaster: { show: ReturnType<typeof vi.fn> };

  function setup(totpEnabled = false): ComponentFixture<Profile2fa> {
    gateway = {
      setupTotp: vi.fn(() =>
        of({ qrCodeDataUri: 'data:image/png;base64,AAA', otpauthUri: 'otpauth://totp/x' }),
      ),
      verifyTotpSetup: vi.fn(() => of({ recoveryCodes: ['code-1', 'code-2'] })),
      disableTotp: vi.fn(() => of({ message: 'ok' })),
    };
    authState = {
      user: signal({ ...ProfileBuilder.default().build(), totpEnabled }),
      updateUserData: vi.fn(),
    };
    toaster = { show: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthGateway, useValue: gateway },
        { provide: AuthState, useValue: authState },
        { provide: Toaster, useValue: toaster },
      ],
    });
    const fixture = TestBed.createComponent(Profile2fa);
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(fixture: ComponentFixture<Profile2fa>, id: string): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function buttonOf(fixture: ComponentFixture<Profile2fa>, id: string): HTMLButtonElement {
    return byTestId(fixture, id).querySelector('button') as HTMLButtonElement;
  }

  function click(fixture: ComponentFixture<Profile2fa>, id: string): void {
    buttonOf(fixture, id).click();
    fixture.detectChanges();
  }

  function type(fixture: ComponentFixture<Profile2fa>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  async function submit(fixture: ComponentFixture<Profile2fa>, id: string): Promise<void> {
    byTestId<HTMLFormElement>(fixture, id).dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function openVerifyStep(fixture: ComponentFixture<Profile2fa>): void {
    click(fixture, 'totp-start');
    click(fixture, 'totp-next');
  }

  describe('setup', () => {
    it('shows the QR code once the setup starts', () => {
      // Given
      const fixture = setup();

      // When
      click(fixture, 'totp-start');

      // Then
      expect(gateway.setupTotp).toHaveBeenCalledTimes(1);
      expect(byTestId<HTMLImageElement>(fixture, 'totp-qrcode').getAttribute('src')).toBe(
        'data:image/png;base64,AAA',
      );
    });

    it.each([
      ['', 'Le code est requis'],
      ['12ab', 'Le code doit contenir exactement 6 chiffres'],
    ])('flags the code "%s" once the field is left', (value, message) => {
      // Given
      const fixture = setup();
      openVerifyStep(fixture);

      // When
      type(fixture, 'totp-token', value);

      // Then
      expect(byTestId(fixture, 'totp-token-error').textContent).toContain(message);
    });

    it('limits the code field to 6 characters', () => {
      // Given
      const fixture = setup();

      // When
      openVerifyStep(fixture);

      // Then
      expect(byTestId(fixture, 'totp-token').getAttribute('maxlength')).toBe('6');
    });

    it('activates the 2FA with a valid code and shows the recovery codes', async () => {
      // Given
      const fixture = setup();
      openVerifyStep(fixture);
      type(fixture, 'totp-token', '123456');

      // When
      await submit(fixture, 'totp-verify-form');

      // Then
      expect(gateway.verifyTotpSetup).toHaveBeenCalledTimes(1);
      expect(gateway.verifyTotpSetup).toHaveBeenCalledWith('123456');
      expect(byTestId(fixture, 'totp-recovery-codes').textContent).toContain('code-1');
      expect(authState.updateUserData).toHaveBeenCalledWith(
        expect.objectContaining({ totpEnabled: true }),
      );
      expect(toaster.show).toHaveBeenCalledWith(
        'success',
        '2FA activée',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('verifies nothing when the code is invalid', async () => {
      // Given
      const fixture = setup();
      openVerifyStep(fixture);
      type(fixture, 'totp-token', '12ab');

      // When
      await submit(fixture, 'totp-verify-form');

      // Then
      expect(gateway.verifyTotpSetup).not.toHaveBeenCalled();
    });

    it('reveals the code error when submitted empty, with the button still enabled', async () => {
      // Given
      const fixture = setup();
      openVerifyStep(fixture);
      expect(buttonOf(fixture, 'totp-verify-submit').disabled).toBe(false);

      // When
      await submit(fixture, 'totp-verify-form');

      // Then
      expect(gateway.verifyTotpSetup).not.toHaveBeenCalled();
      expect(byTestId(fixture, 'totp-token-error').textContent).toContain('Le code est requis');
      expect(byTestId(fixture, 'totp-token').getAttribute('aria-invalid')).toBe('true');
    });

    it('starts the code step afresh after a cancellation', () => {
      // Given
      const fixture = setup();
      openVerifyStep(fixture);
      type(fixture, 'totp-token', '12');
      click(fixture, 'totp-verify-cancel');

      // When
      openVerifyStep(fixture);

      // Then
      expect(byTestId<HTMLInputElement>(fixture, 'totp-token').value).toBe('');
      expect(byTestId(fixture, 'totp-token-error')).toBeNull();
    });

    it('warns and stays on the code step when the API rejects the code', async () => {
      // Given
      const fixture = setup();
      gateway.verifyTotpSetup.mockReturnValue(throwError(() => new Error('401')));
      openVerifyStep(fixture);
      type(fixture, 'totp-token', '123456');

      // When
      await submit(fixture, 'totp-verify-form');

      // Then
      expect(toaster.show).toHaveBeenCalledWith(
        'danger',
        'Code invalide',
        expect.any(String),
        expect.any(Object),
      );
      expect(byTestId(fixture, 'totp-verify-form')).not.toBeNull();
    });
  });

  describe('disable', () => {
    it('disables the 2FA with the password and closes the form', async () => {
      // Given
      const fixture = setup(true);
      click(fixture, 'totp-disable-open');
      type(fixture, 'totp-disable-password', 'mon-secret');

      // When
      await submit(fixture, 'totp-disable-form');

      // Then
      expect(gateway.disableTotp).toHaveBeenCalledTimes(1);
      expect(gateway.disableTotp).toHaveBeenCalledWith('mon-secret');
      expect(authState.updateUserData).toHaveBeenCalledWith(
        expect.objectContaining({ totpEnabled: false }),
      );
      expect(byTestId(fixture, 'totp-disable-form')).toBeNull();
    });

    it('disables nothing without a password', async () => {
      // Given
      const fixture = setup(true);
      click(fixture, 'totp-disable-open');

      // When
      await submit(fixture, 'totp-disable-form');

      // Then
      expect(gateway.disableTotp).not.toHaveBeenCalled();
    });

    it('reveals the password error when submitted empty, with the button still enabled', async () => {
      // Given
      const fixture = setup(true);
      click(fixture, 'totp-disable-open');
      expect(buttonOf(fixture, 'totp-disable-submit').disabled).toBe(false);

      // When
      await submit(fixture, 'totp-disable-form');

      // Then
      expect(gateway.disableTotp).not.toHaveBeenCalled();
      expect(byTestId(fixture, 'totp-disable-password-error').textContent).toContain(
        'Mot de passe requis',
      );
    });

    it('warns and keeps the form open when the password is wrong', async () => {
      // Given
      const fixture = setup(true);
      gateway.disableTotp.mockReturnValue(throwError(() => new Error('401')));
      click(fixture, 'totp-disable-open');
      type(fixture, 'totp-disable-password', 'faux');

      // When
      await submit(fixture, 'totp-disable-form');

      // Then
      expect(toaster.show).toHaveBeenCalledWith(
        'danger',
        'Erreur',
        'Mot de passe incorrect',
        expect.any(Object),
      );
      expect(byTestId(fixture, 'totp-disable-form')).not.toBeNull();
    });
  });
});
