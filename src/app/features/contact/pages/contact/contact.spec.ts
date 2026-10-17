import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { Contact } from './contact';
import { HttpContactGateway } from '../../infra/http-contact.gateway';

describe('Contact', () => {
  let gateway: { send: ReturnType<typeof vi.fn> };

  function setup(): ComponentFixture<Contact> {
    gateway = { send: vi.fn().mockReturnValue(of(undefined)) };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: HttpContactGateway, useValue: gateway }],
    });
    const fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(fixture: ComponentFixture<Contact>, id: string): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<Contact>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
  }

  function fillValidForm(fixture: ComponentFixture<Contact>): void {
    type(fixture, 'contact-name', 'Camille');
    type(fixture, 'contact-email', 'camille@example.com');
    type(fixture, 'contact-subject', 'Question');
    type(fixture, 'contact-message', 'Bonjour, une question sur Candidash.');
  }

  function submit(fixture: ComponentFixture<Contact>): void {
    byTestId<HTMLFormElement>(fixture, 'contact-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('sends a valid message and confirms it', () => {
    // Given
    const fixture = setup();
    fillValidForm(fixture);

    // When
    submit(fixture);

    // Then
    expect(gateway.send).toHaveBeenCalledWith({
      name: 'Camille',
      email: 'camille@example.com',
      subject: 'Question',
      message: 'Bonjour, une question sur Candidash.',
      website: '',
    });
    expect(byTestId(fixture, 'contact-success')).not.toBeNull();
    expect(byTestId(fixture, 'contact-form')).toBeNull();
  });

  it('reveals every error and sends nothing when the form is invalid', () => {
    // Given
    const fixture = setup();

    // When
    submit(fixture);

    // Then
    expect(gateway.send).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('[role="alert"]').length).toBe(4);
    expect(byTestId(fixture, 'contact-email').getAttribute('aria-invalid')).toBe('true');
  });

  it('flags an invalid email once the field is left', () => {
    // Given
    const fixture = setup();

    // When
    type(fixture, 'contact-email', 'pas-un-email');
    fixture.detectChanges();

    // Then
    expect(byTestId(fixture, 'contact-email-error').textContent).toContain('email valide');
  });

  it('keeps the button enabled while invalid, disabled only while sending', () => {
    // Given
    const fixture = setup();
    const pending = new Subject<void>();
    gateway.send.mockReturnValue(pending);
    const button = byTestId<HTMLButtonElement>(fixture, 'contact-submit');
    expect(button.disabled).toBe(false);

    // When
    fillValidForm(fixture);
    submit(fixture);

    // Then
    expect(byTestId<HTMLButtonElement>(fixture, 'contact-submit').disabled).toBe(true);
  });

  it.each([
    [429, 'Trop de messages'],
    [503, 'pas pu être envoyé'],
  ])('shows an error and keeps the input when the API answers %i', (status, expected) => {
    // Given
    const fixture = setup();
    gateway.send.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    fillValidForm(fixture);

    // When
    submit(fixture);

    // Then
    expect(byTestId(fixture, 'contact-error').textContent).toContain(expected);
    expect(byTestId<HTMLInputElement>(fixture, 'contact-name').value).toBe('Camille');
  });
});
