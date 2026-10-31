import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ForgotPassword } from './forgot-password';
import { AuthState } from '@features/auth/application/auth-state';

describe('ForgotPassword', () => {
  let authState: {
    isLoading: ReturnType<typeof signal<boolean>>;
    forgotPassword: ReturnType<typeof vi.fn>;
  };

  function setup(): ComponentFixture<ForgotPassword> {
    authState = {
      isLoading: signal(false),
      forgotPassword: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthState, useValue: authState }],
    });
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(
    fixture: ComponentFixture<ForgotPassword>,
    id: string,
  ): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<ForgotPassword>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  async function submit(fixture: ComponentFixture<ForgotPassword>): Promise<void> {
    byTestId<HTMLFormElement>(fixture, 'forgot-password-form').dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function submitButton(fixture: ComponentFixture<ForgotPassword>): HTMLButtonElement {
    return byTestId(fixture, 'forgot-password-submit').querySelector('button') as HTMLButtonElement;
  }

  it.each([
    ['', "L'email est requis"],
    ['pas-un-email', 'Veuillez entrer un email valide'],
  ])('flags the email "%s" once the field is left', (value, expected) => {
    // Given
    const fixture = setup();

    // When
    type(fixture, 'forgot-password-email', value);

    // Then
    expect(byTestId(fixture, 'forgot-password-email-error').textContent).toContain(expected);
  });

  it('sends the reset link for a valid email and confirms it', async () => {
    // Given
    const fixture = setup();
    type(fixture, 'forgot-password-email', 'camille@example.com');

    // When
    await submit(fixture);

    // Then
    expect(authState.forgotPassword).toHaveBeenCalledTimes(1);
    expect(authState.forgotPassword).toHaveBeenCalledWith({ email: 'camille@example.com' });
    expect(byTestId(fixture, 'forgot-password-sent')).not.toBeNull();
    expect(byTestId(fixture, 'forgot-password-form')).toBeNull();
  });

  it('confirms anyway when the API fails (no account enumeration)', async () => {
    // Given
    const fixture = setup();
    authState.forgotPassword.mockReturnValue(throwError(() => new Error('500')));
    type(fixture, 'forgot-password-email', 'camille@example.com');

    // When
    await submit(fixture);

    // Then
    expect(byTestId(fixture, 'forgot-password-sent')).not.toBeNull();
  });

  it('reveals the error and sends nothing when the form is invalid', async () => {
    // Given
    const fixture = setup();

    // When
    await submit(fixture);

    // Then
    expect(authState.forgotPassword).not.toHaveBeenCalled();
    expect(byTestId(fixture, 'forgot-password-email-error').textContent).toContain(
      "L'email est requis",
    );
    expect(byTestId(fixture, 'forgot-password-email').getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps the button enabled while invalid, disabled only while loading', () => {
    // Given
    const fixture = setup();
    expect(submitButton(fixture).disabled).toBe(false);

    // When
    authState.isLoading.set(true);
    fixture.detectChanges();

    // Then
    expect(submitButton(fixture).disabled).toBe(true);
  });

  it('shows an empty form again on "Envoyer à nouveau"', async () => {
    // Given
    const fixture = setup();
    type(fixture, 'forgot-password-email', 'camille@example.com');
    await submit(fixture);

    // When
    byTestId<HTMLButtonElement>(fixture, 'forgot-password-resend').click();
    fixture.detectChanges();

    // Then
    expect(byTestId<HTMLInputElement>(fixture, 'forgot-password-email').value).toBe('');
    expect(byTestId(fixture, 'forgot-password-email-error')).toBeNull();
  });
});
