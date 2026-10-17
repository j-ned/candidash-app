import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ProfileSecurity } from './profile-security';
import { ProfileState } from '@features/profile/application/profile-state';

describe('ProfileSecurity', () => {
  let profileState: {
    isLoading: ReturnType<typeof signal<boolean>>;
    changePassword: ReturnType<typeof vi.fn>;
  };

  function setup(): ComponentFixture<ProfileSecurity> {
    profileState = {
      isLoading: signal(false),
      changePassword: vi.fn(() => of({ message: 'Mot de passe modifié' })),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ProfileState, useValue: profileState }],
    });
    const fixture = TestBed.createComponent(ProfileSecurity);
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(
    fixture: ComponentFixture<ProfileSecurity>,
    id: string,
  ): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<ProfileSecurity>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function fillValidForm(fixture: ComponentFixture<ProfileSecurity>): void {
    type(fixture, 'current-password', 'ancien-secret');
    type(fixture, 'new-password', 'nouveau-secret');
    type(fixture, 'confirm-password', 'nouveau-secret');
  }

  async function submit(fixture: ComponentFixture<ProfileSecurity>): Promise<void> {
    byTestId<HTMLFormElement>(fixture, 'password-form').dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it.each([
    ['current-password', 'Mot de passe actuel requis'],
    ['new-password', 'Nouveau mot de passe requis'],
    ['confirm-password', 'Confirmation du mot de passe requise'],
  ])('flags the empty field %s once it is left', (id, message) => {
    // Given
    const fixture = setup();

    // When
    type(fixture, id, '');

    // Then
    expect(byTestId(fixture, `${id}-error`).textContent).toContain(message);
  });

  it('flags a new password shorter than 8 characters', () => {
    // Given
    const fixture = setup();

    // When
    type(fixture, 'new-password', 'court');

    // Then
    expect(byTestId(fixture, 'new-password-error').textContent).toContain(
      'Le mot de passe doit contenir au moins 8 caractères',
    );
  });

  it('flags a confirmation that differs from the new password', () => {
    // Given
    const fixture = setup();
    type(fixture, 'new-password', 'nouveau-secret');

    // When
    type(fixture, 'confirm-password', 'autre-secret');

    // Then
    expect(byTestId(fixture, 'confirm-password-error').textContent).toContain(
      'Les mots de passe ne correspondent pas',
    );
  });

  it('clears the mismatch once the confirmation is fixed', () => {
    // Given
    const fixture = setup();
    type(fixture, 'new-password', 'nouveau-secret');
    type(fixture, 'confirm-password', 'autre-secret');

    // When
    type(fixture, 'confirm-password', 'nouveau-secret');

    // Then
    expect(byTestId(fixture, 'confirm-password-error')).toBeNull();
  });

  it('clears the mismatch once the new password is changed to match', () => {
    // Given
    const fixture = setup();
    type(fixture, 'new-password', 'nouveau-secret');
    type(fixture, 'confirm-password', 'autre-secret');

    // When
    type(fixture, 'new-password', 'autre-secret');

    // Then
    expect(byTestId(fixture, 'confirm-password-error')).toBeNull();
  });

  it('changes the password once and empties the form', async () => {
    // Given
    const fixture = setup();
    fillValidForm(fixture);

    // When
    await submit(fixture);

    // Then
    expect(profileState.changePassword).toHaveBeenCalledTimes(1);
    expect(profileState.changePassword).toHaveBeenCalledWith({
      currentPassword: 'ancien-secret',
      newPassword: 'nouveau-secret',
    });
    expect(byTestId<HTMLInputElement>(fixture, 'current-password').value).toBe('');
    expect(byTestId<HTMLInputElement>(fixture, 'confirm-password').value).toBe('');
  });

  it('changes nothing when the confirmation differs', async () => {
    // Given
    const fixture = setup();
    fillValidForm(fixture);
    type(fixture, 'confirm-password', 'autre-secret');

    // When
    await submit(fixture);

    // Then
    expect(profileState.changePassword).not.toHaveBeenCalled();
  });

  it('disables the button while the password is changing', () => {
    // Given
    const fixture = setup();

    // When
    profileState.isLoading.set(true);
    fixture.detectChanges();

    // Then
    const button = byTestId(fixture, 'password-submit').querySelector('button');
    expect(button?.disabled).toBe(true);
  });
});
