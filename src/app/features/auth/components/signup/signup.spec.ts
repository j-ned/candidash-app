import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Signup } from './signup';
import { AuthState } from '@features/auth/application/auth-state';
import { VerificationModal } from '@shared/ui/verification-modal/verification-modal';

describe('Signup', () => {
  let authState: {
    isLoading: ReturnType<typeof signal<boolean>>;
    signup: ReturnType<typeof vi.fn>;
    verifyRegistration: ReturnType<typeof vi.fn>;
    resendVerificationCode: ReturnType<typeof vi.fn>;
  };
  let verificationModal: { showVerificationModal: ReturnType<typeof vi.fn> };

  function setup(): ComponentFixture<Signup> {
    authState = {
      isLoading: signal(false),
      signup: vi.fn().mockReturnValue(of({ message: 'ok' })),
      verifyRegistration: vi.fn().mockReturnValue(of({ user: {} })),
      resendVerificationCode: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };
    verificationModal = { showVerificationModal: vi.fn().mockResolvedValue({}) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthState, useValue: authState },
        { provide: VerificationModal, useValue: verificationModal },
      ],
    });
    const fixture = TestBed.createComponent(Signup);
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(fixture: ComponentFixture<Signup>, id: string): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<Signup>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function fillValidForm(fixture: ComponentFixture<Signup>, username = 'john_doe'): void {
    type(fixture, 'signup-email', 'camille@example.com');
    type(fixture, 'signup-username', username);
    type(fixture, 'signup-password', 'secret123');
    type(fixture, 'signup-confirm', 'secret123');
  }

  async function submit(fixture: ComponentFixture<Signup>): Promise<void> {
    byTestId<HTMLFormElement>(fixture, 'signup-form').dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function submitButton(fixture: ComponentFixture<Signup>): HTMLButtonElement {
    return byTestId(fixture, 'signup-submit').querySelector('button') as HTMLButtonElement;
  }

  it.each([
    ['signup-email', '', "L'email est requis"],
    ['signup-email', 'pas-un-email', 'Veuillez entrer un email valide'],
    ['signup-username', 'ab', "Le nom d'utilisateur doit contenir au moins 3 caractères"],
    [
      'signup-username',
      'john doe!',
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores",
    ],
    ['signup-password', '', 'Le mot de passe est requis'],
    ['signup-password', 'abc', 'Le mot de passe doit contenir au moins 6 caractères'],
    ['signup-confirm', '', 'La confirmation du mot de passe est requise'],
  ])('flags %s = "%s" once the field is left', (id, value, expected) => {
    // Given
    const fixture = setup();

    // When
    type(fixture, id, value);

    // Then
    expect(byTestId(fixture, `${id}-error`).textContent).toContain(expected);
  });

  it('flags a confirmation that differs from the password', () => {
    // Given
    const fixture = setup();
    type(fixture, 'signup-password', 'secret123');

    // When
    type(fixture, 'signup-confirm', 'secret124');

    // Then
    expect(byTestId(fixture, 'signup-confirm-error').textContent).toContain(
      'Les mots de passe ne correspondent pas',
    );
  });

  it('re-checks the confirmation when the password changes afterwards', () => {
    // Given
    const fixture = setup();
    type(fixture, 'signup-password', 'secret123');
    type(fixture, 'signup-confirm', 'secret123');
    expect(byTestId(fixture, 'signup-confirm-error')).toBeNull();

    // When
    type(fixture, 'signup-password', 'secret999');

    // Then
    expect(byTestId(fixture, 'signup-confirm-error').textContent).toContain(
      'Les mots de passe ne correspondent pas',
    );
  });

  it('creates the account, then asks for the verification code', async () => {
    // Given
    const fixture = setup();
    fillValidForm(fixture);

    // When
    await submit(fixture);

    // Then
    expect(authState.signup).toHaveBeenCalledTimes(1);
    expect(authState.signup).toHaveBeenCalledWith({
      email: 'camille@example.com',
      password: 'secret123',
      username: 'john_doe',
    });
    expect(verificationModal.showVerificationModal).toHaveBeenCalledWith({
      email: 'camille@example.com',
    });
  });

  it('sends no username when the optional field is left empty', async () => {
    // Given
    const fixture = setup();
    fillValidForm(fixture, '');

    // When
    await submit(fixture);

    // Then
    expect(authState.signup).toHaveBeenCalledWith({
      email: 'camille@example.com',
      password: 'secret123',
      username: undefined,
    });
  });

  it('verifies the registration with the code typed in the modal', async () => {
    // Given
    const fixture = setup();
    verificationModal.showVerificationModal.mockResolvedValue({ verificationCode: '123456' });
    fillValidForm(fixture);

    // When
    await submit(fixture);
    await fixture.whenStable();

    // Then
    expect(authState.verifyRegistration).toHaveBeenCalledWith({
      email: 'camille@example.com',
      verificationCode: '123456',
    });
  });

  it('reveals every error and creates nothing when the form is invalid', async () => {
    // Given
    const fixture = setup();

    // When
    await submit(fixture);

    // Then
    expect(authState.signup).not.toHaveBeenCalled();
    expect(byTestId(fixture, 'signup-email-error')).not.toBeNull();
    expect(byTestId(fixture, 'signup-password-error')).not.toBeNull();
    expect(byTestId(fixture, 'signup-confirm-error')).not.toBeNull();
    expect(byTestId(fixture, 'signup-username-error')).toBeNull();
    expect(byTestId(fixture, 'signup-email').getAttribute('aria-invalid')).toBe('true');
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

  it('toggles each password visibility independently', () => {
    // Given
    const fixture = setup();

    // When
    byTestId<HTMLButtonElement>(fixture, 'signup-password-toggle').click();
    fixture.detectChanges();

    // Then
    expect(byTestId<HTMLInputElement>(fixture, 'signup-password').type).toBe('text');
    expect(byTestId<HTMLInputElement>(fixture, 'signup-confirm').type).toBe('password');
  });
});
