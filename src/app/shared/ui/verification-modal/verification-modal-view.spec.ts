import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { VerificationModalView } from './verification-modal-view';
import { AuthState } from '@features/auth/application/auth-state';

describe('VerificationModalView', () => {
  let authState: { isLoading: ReturnType<typeof signal<boolean>> };

  function setup(): ComponentFixture<VerificationModalView> {
    authState = { isLoading: signal(false) };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthState, useValue: authState }],
    });
    const fixture = TestBed.createComponent(VerificationModalView);
    fixture.componentRef.setInput('data', { email: 'camille@example.com' });
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(
    fixture: ComponentFixture<VerificationModalView>,
    id: string,
  ): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<VerificationModalView>, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, 'verification-modal-code');
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  async function submit(fixture: ComponentFixture<VerificationModalView>): Promise<void> {
    byTestId<HTMLFormElement>(fixture, 'verification-modal-form').dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function submitButton(fixture: ComponentFixture<VerificationModalView>): HTMLButtonElement {
    return byTestId(fixture, 'verification-modal-submit').querySelector(
      'button',
    ) as HTMLButtonElement;
  }

  function collect(fixture: ComponentFixture<VerificationModalView>): string[] {
    const codes: string[] = [];
    fixture.componentInstance.verificationSubmitted.subscribe((code) => codes.push(code));
    return codes;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops typing at 6 characters', () => {
    // Given / When
    const fixture = setup();

    // Then
    expect(byTestId(fixture, 'verification-modal-code').getAttribute('maxlength')).toBe('6');
  });

  it.each([
    ['', 'Le code de validation est requis'],
    ['12a', 'Le code doit être composé de 6 chiffres'],
  ])('flags the code "%s" once the field is left', (value, expected) => {
    // Given
    const fixture = setup();

    // When
    type(fixture, value);

    // Then
    expect(byTestId(fixture, 'verification-modal-code-error').textContent).toContain(expected);
  });

  it('emits the 6-digit code', async () => {
    // Given
    const fixture = setup();
    const codes = collect(fixture);
    type(fixture, '123456');

    // When
    await submit(fixture);

    // Then
    expect(codes).toEqual(['123456']);
  });

  it('reveals the error and emits nothing when the code is missing', async () => {
    // Given
    const fixture = setup();
    const codes = collect(fixture);

    // When
    await submit(fixture);

    // Then
    expect(codes).toEqual([]);
    expect(byTestId(fixture, 'verification-modal-code-error').textContent).toContain(
      'Le code de validation est requis',
    );
    expect(byTestId(fixture, 'verification-modal-code').getAttribute('aria-invalid')).toBe('true');
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

  it('asks for a new code and blocks the resend during the cooldown', () => {
    // Given
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const fixture = setup();
    let requests = 0;
    fixture.componentInstance.resendRequested.subscribe(() => requests++);

    // When
    byTestId<HTMLButtonElement>(fixture, 'verification-modal-resend').click();
    fixture.detectChanges();

    // Then
    expect(requests).toBe(1);
    expect(byTestId<HTMLButtonElement>(fixture, 'verification-modal-resend').disabled).toBe(true);
  });

  it('emits cancelled when closed', () => {
    // Given
    const fixture = setup();
    let cancelled = 0;
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);

    // When
    byTestId<HTMLButtonElement>(fixture, 'verification-modal-close').click();

    // Then
    expect(cancelled).toBe(1);
  });
});
