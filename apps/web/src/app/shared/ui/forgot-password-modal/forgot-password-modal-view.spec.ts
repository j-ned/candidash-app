import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ForgotPasswordModalView } from './forgot-password-modal-view';
import { AuthState } from '@features/auth/application/auth-state';

describe('ForgotPasswordModalView', () => {
  let authState: {
    isLoading: ReturnType<typeof signal<boolean>>;
    forgotPassword: ReturnType<typeof vi.fn>;
  };

  function setup(email?: string): ComponentFixture<ForgotPasswordModalView> {
    authState = {
      isLoading: signal(false),
      forgotPassword: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthState, useValue: authState }],
    });
    const fixture = TestBed.createComponent(ForgotPasswordModalView);
    if (email !== undefined) {
      fixture.componentRef.setInput('data', { email });
    }
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(
    fixture: ComponentFixture<ForgotPasswordModalView>,
    id: string,
  ): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<ForgotPasswordModalView>, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, 'forgot-password-modal-email');
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  async function submit(fixture: ComponentFixture<ForgotPasswordModalView>): Promise<void> {
    byTestId<HTMLFormElement>(fixture, 'forgot-password-modal-form').dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function submitButton(fixture: ComponentFixture<ForgotPasswordModalView>): HTMLButtonElement {
    return byTestId(fixture, 'forgot-password-modal-submit').querySelector(
      'button',
    ) as HTMLButtonElement;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pre-fills the email given by the opener', () => {
    // Given / When
    const fixture = setup('camille@example.com');

    // Then
    expect(byTestId<HTMLInputElement>(fixture, 'forgot-password-modal-email').value).toBe(
      'camille@example.com',
    );
  });

  it.each([
    ['', "L'email est requis"],
    ['pas-un-email', 'Veuillez entrer un email valide'],
  ])('flags the email "%s" once the field is left', (value, expected) => {
    // Given
    const fixture = setup();

    // When
    type(fixture, value);

    // Then
    expect(byTestId(fixture, 'forgot-password-modal-email-error').textContent).toContain(expected);
  });

  it.each([
    ['succeeds', () => of({ message: 'ok' })],
    ['fails', () => throwError(() => new Error('500'))],
  ])('sends the link, emits the email and confirms when the API %s', async (_, response) => {
    // Given
    const fixture = setup('camille@example.com');
    authState.forgotPassword.mockReturnValue(response());
    const emitted: string[] = [];
    fixture.componentInstance.emailSubmitted.subscribe((email) => emitted.push(email));

    // When
    await submit(fixture);

    // Then
    expect(authState.forgotPassword).toHaveBeenCalledTimes(1);
    expect(authState.forgotPassword).toHaveBeenCalledWith({ email: 'camille@example.com' });
    expect(emitted).toEqual(['camille@example.com']);
    expect(byTestId(fixture, 'forgot-password-modal-sent')).not.toBeNull();
    expect(byTestId<HTMLButtonElement>(fixture, 'forgot-password-modal-resend').disabled).toBe(
      true,
    );
  });

  it('resends the link once the cooldown is over', async () => {
    // Given
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const fixture = setup('camille@example.com');
    await submit(fixture);
    vi.advanceTimersByTime(60_000);
    fixture.detectChanges();

    // When
    byTestId<HTMLButtonElement>(fixture, 'forgot-password-modal-resend').click();
    await fixture.whenStable();
    fixture.detectChanges();

    // Then
    expect(authState.forgotPassword).toHaveBeenCalledTimes(2);
    expect(byTestId(fixture, 'forgot-password-modal-sent')).not.toBeNull();
  });

  it('reveals the error and sends nothing when the email is missing', async () => {
    // Given
    const fixture = setup();

    // When
    await submit(fixture);

    // Then
    expect(authState.forgotPassword).not.toHaveBeenCalled();
    expect(byTestId(fixture, 'forgot-password-modal-email-error').textContent).toContain(
      "L'email est requis",
    );
    expect(byTestId(fixture, 'forgot-password-modal-email').getAttribute('aria-invalid')).toBe(
      'true',
    );
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

  it('emits cancelled on "Annuler"', () => {
    // Given
    const fixture = setup();
    let cancelled = 0;
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);

    // When
    byTestId<HTMLButtonElement>(fixture, 'forgot-password-modal-cancel').click();

    // Then
    expect(cancelled).toBe(1);
  });
});
