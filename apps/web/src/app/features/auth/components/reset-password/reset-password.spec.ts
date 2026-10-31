import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ResetPassword } from './reset-password';
import { AuthState } from '@features/auth/application/auth-state';

const STRONG_PASSWORD = 'Secret1!x';

describe('ResetPassword', () => {
  let authState: {
    isLoading: ReturnType<typeof signal<boolean>>;
    resetPassword: ReturnType<typeof vi.fn>;
  };
  let navigate: ReturnType<typeof vi.spyOn>;

  function setup(token = 'reset-token'): ComponentFixture<ResetPassword> {
    authState = {
      isLoading: signal(false),
      resetPassword: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthState, useValue: authState }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ResetPassword);
    fixture.componentRef.setInput('token', token);
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(
    fixture: ComponentFixture<ResetPassword>,
    id: string,
  ): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<ResetPassword>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  async function submit(fixture: ComponentFixture<ResetPassword>): Promise<void> {
    byTestId<HTMLFormElement>(fixture, 'reset-password-form').dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function submitButton(fixture: ComponentFixture<ResetPassword>): HTMLButtonElement {
    return byTestId(fixture, 'reset-password-submit').querySelector('button') as HTMLButtonElement;
  }

  it('sends back to the forgot-password page without a token', () => {
    // Given / When
    setup('');

    // Then
    expect(navigate).toHaveBeenCalledWith(['/auth/forgot-password']);
  });

  it.each([
    ['reset-password-new', '', 'Le mot de passe est requis'],
    ['reset-password-new', 'Ab1!', 'Le mot de passe doit contenir au moins 8 caractères'],
    [
      'reset-password-new',
      'abcdefgh',
      'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial',
    ],
    ['reset-password-confirm', '', 'La confirmation du mot de passe est requise'],
  ])('flags %s = "%s" once the field is left', (id, value, expected) => {
    // Given
    const fixture = setup();

    // When
    type(fixture, id, value);

    // Then
    expect(byTestId(fixture, `${id}-error`).textContent).toContain(expected);
  });

  it('flags a confirmation that differs from the new password', () => {
    // Given
    const fixture = setup();
    type(fixture, 'reset-password-new', STRONG_PASSWORD);

    // When
    type(fixture, 'reset-password-confirm', 'Secret1!y');

    // Then
    expect(byTestId(fixture, 'reset-password-confirm-error').textContent).toContain(
      'Les mots de passe ne correspondent pas',
    );
  });

  it.each([
    ['', []],
    ['abc', ['lowercase']],
    ['Abcdefgh', ['length', 'uppercase', 'lowercase']],
    [STRONG_PASSWORD, ['length', 'uppercase', 'lowercase', 'number', 'special']],
  ])('lights the rules met by "%s"', (value, met) => {
    // Given
    const fixture = setup();

    // When
    type(fixture, 'reset-password-new', value);

    // Then
    for (const rule of ['length', 'uppercase', 'lowercase', 'number', 'special']) {
      const item = byTestId(fixture, `reset-password-rule-${rule}`);
      expect(item.classList.contains('text-success')).toBe(met.includes(rule));
    }
  });

  it('resets the password with the token and confirms it', async () => {
    // Given
    const fixture = setup();
    type(fixture, 'reset-password-new', STRONG_PASSWORD);
    type(fixture, 'reset-password-confirm', STRONG_PASSWORD);

    // When
    await submit(fixture);

    // Then
    expect(authState.resetPassword).toHaveBeenCalledTimes(1);
    expect(authState.resetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      newPassword: STRONG_PASSWORD,
    });
    expect(byTestId(fixture, 'reset-password-done')).not.toBeNull();
    expect(byTestId(fixture, 'reset-password-form')).toBeNull();
  });

  it('reveals every error and resets nothing when the form is invalid', async () => {
    // Given
    const fixture = setup();

    // When
    await submit(fixture);

    // Then
    expect(authState.resetPassword).not.toHaveBeenCalled();
    expect(byTestId(fixture, 'reset-password-new-error')).not.toBeNull();
    expect(byTestId(fixture, 'reset-password-confirm-error')).not.toBeNull();
    expect(byTestId(fixture, 'reset-password-new').getAttribute('aria-invalid')).toBe('true');
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
    byTestId<HTMLButtonElement>(fixture, 'reset-password-confirm-toggle').click();
    fixture.detectChanges();

    // Then
    expect(byTestId<HTMLInputElement>(fixture, 'reset-password-new').type).toBe('password');
    expect(byTestId<HTMLInputElement>(fixture, 'reset-password-confirm').type).toBe('text');
  });
});
