import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ProfileInfo } from './profile-info';
import { ProfileState } from '@features/profile/application/profile-state';
import { AuthState } from '@features/auth/application/auth-state';
import { ProfileBuilder } from '@features/profile/test-utils/profile.builder';

describe('ProfileInfo', () => {
  let profileState: {
    isLoading: ReturnType<typeof signal<boolean>>;
    updateProfile: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
  };

  function setup(): ComponentFixture<ProfileInfo> {
    const profile = ProfileBuilder.default().build();
    profileState = {
      isLoading: signal(false),
      updateProfile: vi.fn(() => of(profile)),
      deleteAccount: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProfileState, useValue: profileState },
        {
          provide: AuthState,
          useValue: {
            user: signal({ ...profile, totpEnabled: false }),
            signout: vi.fn(() => of(undefined)),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ProfileInfo);
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(fixture: ComponentFixture<ProfileInfo>, id: string): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function submitButton(fixture: ComponentFixture<ProfileInfo>): HTMLButtonElement {
    return byTestId(fixture, 'profile-info-submit').querySelector('button') as HTMLButtonElement;
  }

  function type(fixture: ComponentFixture<ProfileInfo>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  async function submit(fixture: ComponentFixture<ProfileInfo>): Promise<void> {
    byTestId<HTMLFormElement>(fixture, 'profile-info-form').dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('prefills the form with the connected user', async () => {
    // Given / When
    const fixture = setup();
    await fixture.whenStable();

    // Then
    expect(byTestId<HTMLInputElement>(fixture, 'profile-email').value).toBe('john@example.com');
    expect(byTestId<HTMLInputElement>(fixture, 'profile-username').value).toBe('john');
  });

  it.each([[''], ['pas-un-email']])('flags the email "%s" once the field is left', (value) => {
    // Given
    const fixture = setup();

    // When
    type(fixture, 'profile-email', value);

    // Then
    expect(byTestId(fixture, 'profile-email-error').textContent).toContain('Email invalide');
  });

  it('shows no error for a valid email', () => {
    // Given
    const fixture = setup();

    // When
    type(fixture, 'profile-email', 'jane@example.com');

    // Then
    expect(byTestId(fixture, 'profile-email-error')).toBeNull();
  });

  it('saves the profile once with the typed values', async () => {
    // Given
    const fixture = setup();
    type(fixture, 'profile-email', 'jane@example.com');
    type(fixture, 'profile-username', 'jane');

    // When
    await submit(fixture);

    // Then
    expect(profileState.updateProfile).toHaveBeenCalledTimes(1);
    expect(profileState.updateProfile).toHaveBeenCalledWith({
      email: 'jane@example.com',
      username: 'jane',
    });
  });

  it('sends no username when the field is emptied', async () => {
    // Given
    const fixture = setup();
    type(fixture, 'profile-username', '');

    // When
    await submit(fixture);

    // Then
    expect(profileState.updateProfile).toHaveBeenCalledWith({
      email: 'john@example.com',
      username: undefined,
    });
  });

  it('saves nothing when the email is invalid', async () => {
    // Given
    const fixture = setup();
    type(fixture, 'profile-email', 'pas-un-email');

    // When
    await submit(fixture);

    // Then
    expect(profileState.updateProfile).not.toHaveBeenCalled();
  });

  it('reveals the email error and saves nothing when submitted invalid', async () => {
    // Given
    const fixture = setup();
    const email = byTestId<HTMLInputElement>(fixture, 'profile-email');
    email.value = '';
    email.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // When
    await submit(fixture);

    // Then
    expect(profileState.updateProfile).not.toHaveBeenCalled();
    expect(byTestId(fixture, 'profile-email-error').textContent).toContain('Email invalide');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('profile-email-error');
  });

  it('keeps the button enabled while the form is invalid', () => {
    // Given
    const fixture = setup();

    // When
    type(fixture, 'profile-email', 'pas-un-email');

    // Then
    expect(submitButton(fixture).disabled).toBe(false);
  });

  it('disables the button while the profile is saving', () => {
    // Given
    const fixture = setup();

    // When
    profileState.isLoading.set(true);
    fixture.detectChanges();

    // Then
    expect(submitButton(fixture).disabled).toBe(true);
  });
});
