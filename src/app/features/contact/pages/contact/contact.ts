import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpContactGateway } from '../../infra/http-contact.gateway';

type ContactForm = {
  name: FormControl<string>;
  email: FormControl<string>;
  subject: FormControl<string>;
  message: FormControl<string>;
  website: FormControl<string>;
};

type ContactField = Exclude<keyof ContactForm, 'website'>;

type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

const ERROR_MESSAGES: Record<ContactField, Record<string, string>> = {
  name: {
    required: 'Le nom est requis.',
    minlength: 'Le nom doit contenir au moins 2 caractères.',
    maxlength: 'Le nom ne peut pas dépasser 100 caractères.',
  },
  email: {
    required: "L'email est requis.",
    email: 'Veuillez entrer un email valide.',
    maxlength: "L'email est trop long.",
  },
  subject: {
    required: 'Le sujet est requis.',
    minlength: 'Le sujet doit contenir au moins 3 caractères.',
    maxlength: 'Le sujet ne peut pas dépasser 150 caractères.',
  },
  message: {
    required: 'Le message est requis.',
    minlength: 'Le message doit contenir au moins 10 caractères.',
    maxlength: 'Le message ne peut pas dépasser 5000 caractères.',
  },
};

const FIELD_CLASS =
  'w-full px-3 py-2 border rounded-md bg-background text-text placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary transition-all duration-200 sm:px-4 sm:py-3 sm:rounded-lg aria-invalid:border-error border-input';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, RouterLink],
  host: { class: 'min-h-screen bg-background block' },
  template: `
    <div class="container mx-auto px-4 py-8 max-w-2xl">
      <header class="mb-8">
        <a
          routerLink="/"
          class="mb-4 inline-flex items-center text-muted hover:text-text transition-colors"
        >
          <svg
            class="w-5 h-5 mr-2"
            aria-hidden="true"
            focusable="false"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Accueil
        </a>
        <h1 class="text-3xl font-bold text-text mb-2">Contact</h1>
        <p class="text-muted">
          Une question sur Candidash ou sur l'extension navigateur ? Écrivez-nous, la réponse arrive
          par e-mail.
        </p>
      </header>

      <main class="bg-card border border-border rounded-lg p-6">
        @if (status() === 'sent') {
          <div data-testid="contact-success" role="status" class="space-y-3 text-center">
            <h2 class="text-xl font-semibold text-text">Message envoyé</h2>
            <p class="text-text/80">Merci ! Vous recevrez une réponse à l'adresse indiquée.</p>
            <a routerLink="/" class="text-primary hover:underline">Retour à l'accueil</a>
          </div>
        } @else {
          <form
            data-testid="contact-form"
            [formGroup]="form"
            (ngSubmit)="submit()"
            novalidate
            class="space-y-5"
          >
            <fieldset class="space-y-5">
              <legend class="sr-only">Votre message</legend>

              <div class="space-y-1">
                <label for="contact-name" class="block text-sm font-medium text-text">Nom</label>
                <input
                  id="contact-name"
                  data-testid="contact-name"
                  formControlName="name"
                  autocomplete="name"
                  aria-required="true"
                  [attr.aria-invalid]="isInvalid('name')"
                  [attr.aria-describedby]="isInvalid('name') ? 'contact-name-error' : null"
                  [class]="fieldClass"
                />
                @if (isInvalid('name')) {
                  <p
                    id="contact-name-error"
                    data-testid="contact-name-error"
                    role="alert"
                    class="text-error text-sm"
                  >
                    {{ errorFor('name') }}
                  </p>
                }
              </div>

              <div class="space-y-1">
                <label for="contact-email" class="block text-sm font-medium text-text">Email</label>
                <input
                  id="contact-email"
                  data-testid="contact-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  aria-required="true"
                  [attr.aria-invalid]="isInvalid('email')"
                  [attr.aria-describedby]="isInvalid('email') ? 'contact-email-error' : null"
                  [class]="fieldClass"
                />
                @if (isInvalid('email')) {
                  <p
                    id="contact-email-error"
                    data-testid="contact-email-error"
                    role="alert"
                    class="text-error text-sm"
                  >
                    {{ errorFor('email') }}
                  </p>
                }
              </div>

              <div class="space-y-1">
                <label for="contact-subject" class="block text-sm font-medium text-text"
                  >Sujet</label
                >
                <input
                  id="contact-subject"
                  data-testid="contact-subject"
                  formControlName="subject"
                  aria-required="true"
                  [attr.aria-invalid]="isInvalid('subject')"
                  [attr.aria-describedby]="isInvalid('subject') ? 'contact-subject-error' : null"
                  [class]="fieldClass"
                />
                @if (isInvalid('subject')) {
                  <p
                    id="contact-subject-error"
                    data-testid="contact-subject-error"
                    role="alert"
                    class="text-error text-sm"
                  >
                    {{ errorFor('subject') }}
                  </p>
                }
              </div>

              <div class="space-y-1">
                <label for="contact-message" class="block text-sm font-medium text-text"
                  >Message</label
                >
                <textarea
                  id="contact-message"
                  data-testid="contact-message"
                  formControlName="message"
                  rows="6"
                  aria-required="true"
                  [attr.aria-invalid]="isInvalid('message')"
                  [attr.aria-describedby]="isInvalid('message') ? 'contact-message-error' : null"
                  [class]="fieldClass"
                ></textarea>
                @if (isInvalid('message')) {
                  <p
                    id="contact-message-error"
                    data-testid="contact-message-error"
                    role="alert"
                    class="text-error text-sm"
                  >
                    {{ errorFor('message') }}
                  </p>
                }
              </div>

              <!-- Honeypot: off-screen and out of the tab order, only bots fill it -->
              <div class="absolute -left-[9999px]" aria-hidden="true">
                <label for="contact-website">Site web</label>
                <input
                  id="contact-website"
                  formControlName="website"
                  tabindex="-1"
                  autocomplete="off"
                />
              </div>
            </fieldset>

            @if (status() === 'error') {
              <p data-testid="contact-error" role="alert" class="text-error text-sm">
                {{ errorMessage() }}
              </p>
            }

            <button
              type="submit"
              data-testid="contact-submit"
              [disabled]="status() === 'sending'"
              class="w-full py-3 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {{ status() === 'sending' ? 'Envoi en cours…' : 'Envoyer' }}
            </button>
          </form>
        }
      </main>
    </div>
  `,
})
export class Contact {
  private readonly gateway = inject(HttpContactGateway);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fieldClass = FIELD_CLASS;
  protected readonly status = signal<SendStatus>('idle');
  protected readonly errorMessage = signal('');

  protected readonly form = new FormGroup<ContactForm>({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)],
    }),
    subject: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(150)],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(5000)],
    }),
    website: new FormControl('', { nonNullable: true }),
  });

  protected isInvalid(field: ContactField): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  protected errorFor(field: ContactField): string {
    const errors = this.form.controls[field].errors ?? {};
    const key = Object.keys(errors)[0];
    return key ? (ERROR_MESSAGES[field][key] ?? '') : '';
  }

  protected submit(): void {
    if (this.status() === 'sending') return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status.set('sending');
    this.gateway
      .send(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.status.set('sent'),
        error: (error: unknown) => {
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 429
              ? 'Trop de messages envoyés, réessayez dans quelques minutes.'
              : "Le message n'a pas pu être envoyé, réessayez plus tard.",
          );
          this.status.set('error');
        },
      });
  }
}
