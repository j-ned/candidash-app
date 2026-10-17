import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  FormField,
  FormRoot,
  email,
  form,
  maxLength,
  minLength,
  required,
  submit,
  type FieldTree,
} from '@angular/forms/signals';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { HttpContactGateway } from '../../infra/http-contact.gateway';
import type { ContactMessage } from '../../domain/models/contact-message.model';

const EMPTY_MESSAGE: ContactMessage = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
};

const FIELD_CLASS =
  'w-full px-3 py-2 border rounded-md bg-background text-text placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary transition-all duration-200 sm:px-4 sm:py-3 sm:rounded-lg aria-invalid:border-error border-input';

@Component({
  selector: 'app-contact',
  imports: [FormRoot, FormField, FieldError, RouterLink],
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
        @if (sent()) {
          <div data-testid="contact-success" role="status" class="space-y-3 text-center">
            <h2 class="text-xl font-semibold text-text">Message envoyé</h2>
            <p class="text-text/80">Merci ! Vous recevrez une réponse à l'adresse indiquée.</p>
            <a routerLink="/" class="text-primary hover:underline">Retour à l'accueil</a>
          </div>
        } @else {
          <form data-testid="contact-form" [formRoot]="contactForm" class="space-y-5">
            <fieldset class="space-y-5">
              <legend class="sr-only">Votre message</legend>

              <div class="space-y-1">
                @let nameInError = contactForm.name().touched() && contactForm.name().invalid();
                <label for="contact-name" class="block text-sm font-medium text-text">Nom</label>
                <input
                  id="contact-name"
                  data-testid="contact-name"
                  [formField]="contactForm.name"
                  autocomplete="name"
                  aria-required="true"
                  [attr.aria-invalid]="nameInError"
                  [attr.aria-describedby]="nameInError ? 'contact-name-error' : null"
                  [class]="fieldClass"
                />
                <app-field-error
                  [field]="contactForm.name"
                  errorId="contact-name-error"
                  testId="contact-name-error"
                />
              </div>

              <div class="space-y-1">
                @let emailInError = contactForm.email().touched() && contactForm.email().invalid();
                <label for="contact-email" class="block text-sm font-medium text-text">Email</label>
                <input
                  id="contact-email"
                  data-testid="contact-email"
                  type="email"
                  [formField]="contactForm.email"
                  autocomplete="email"
                  aria-required="true"
                  [attr.aria-invalid]="emailInError"
                  [attr.aria-describedby]="emailInError ? 'contact-email-error' : null"
                  [class]="fieldClass"
                />
                <app-field-error
                  [field]="contactForm.email"
                  errorId="contact-email-error"
                  testId="contact-email-error"
                />
              </div>

              <div class="space-y-1">
                @let subjectInError =
                  contactForm.subject().touched() && contactForm.subject().invalid();
                <label for="contact-subject" class="block text-sm font-medium text-text"
                  >Sujet</label
                >
                <input
                  id="contact-subject"
                  data-testid="contact-subject"
                  [formField]="contactForm.subject"
                  aria-required="true"
                  [attr.aria-invalid]="subjectInError"
                  [attr.aria-describedby]="subjectInError ? 'contact-subject-error' : null"
                  [class]="fieldClass"
                />
                <app-field-error
                  [field]="contactForm.subject"
                  errorId="contact-subject-error"
                  testId="contact-subject-error"
                />
              </div>

              <div class="space-y-1">
                @let messageInError =
                  contactForm.message().touched() && contactForm.message().invalid();
                <label for="contact-message" class="block text-sm font-medium text-text"
                  >Message</label
                >
                <textarea
                  id="contact-message"
                  data-testid="contact-message"
                  [formField]="contactForm.message"
                  rows="6"
                  aria-required="true"
                  [attr.aria-invalid]="messageInError"
                  [attr.aria-describedby]="messageInError ? 'contact-message-error' : null"
                  [class]="fieldClass"
                ></textarea>
                <app-field-error
                  [field]="contactForm.message"
                  errorId="contact-message-error"
                  testId="contact-message-error"
                />
              </div>

              <!-- Honeypot: off-screen and out of the tab order, only bots fill it -->
              <div class="absolute -left-[9999px]" aria-hidden="true">
                <label for="contact-website">Site web</label>
                <input
                  id="contact-website"
                  [formField]="contactForm.website"
                  tabindex="-1"
                  autocomplete="off"
                />
              </div>
            </fieldset>

            @if (errorMessage()) {
              <p data-testid="contact-error" role="alert" class="text-error text-sm">
                {{ errorMessage() }}
              </p>
            }

            <button
              type="submit"
              data-testid="contact-submit"
              [disabled]="contactForm().submitting()"
              class="w-full py-3 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {{ contactForm().submitting() ? 'Envoi en cours…' : 'Envoyer' }}
            </button>
          </form>
        }
      </main>
    </div>
  `,
})
export class Contact {
  private readonly gateway = inject(HttpContactGateway);

  protected readonly fieldClass = FIELD_CLASS;
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal('');

  private readonly model = signal<ContactMessage>({ ...EMPTY_MESSAGE });

  // Bornes identiques à celles de l'API (ContactMessageDto) ; messages dans le schéma
  protected readonly contactForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Le nom est requis.' });
      minLength(path.name, 2, { message: 'Le nom doit contenir au moins 2 caractères.' });
      maxLength(path.name, 100, { message: 'Le nom ne peut pas dépasser 100 caractères.' });
      required(path.email, { message: "L'email est requis." });
      email(path.email, { message: 'Veuillez entrer un email valide.' });
      maxLength(path.email, 254, { message: "L'email est trop long." });
      required(path.subject, { message: 'Le sujet est requis.' });
      minLength(path.subject, 3, { message: 'Le sujet doit contenir au moins 3 caractères.' });
      maxLength(path.subject, 150, { message: 'Le sujet ne peut pas dépasser 150 caractères.' });
      required(path.message, { message: 'Le message est requis.' });
      minLength(path.message, 10, { message: 'Le message doit contenir au moins 10 caractères.' });
      maxLength(path.message, 5000, {
        message: 'Le message ne peut pas dépasser 5000 caractères.',
      });
    },
    {
      submission: {
        action: (field) => this.send(field),
        // Bouton actif sur un formulaire invalide : submit() révèle les erreurs, focus sur la première
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  // Point d'entrée partagé par FormRoot (événement submit) et les tests
  async submitContact(): Promise<void> {
    await submit(this.contactForm);
  }

  private async send(field: FieldTree<ContactMessage>): Promise<void> {
    this.errorMessage.set('');
    const { name, email, subject, message, website } = field().value();
    try {
      await firstValueFrom(this.gateway.send({ name, email, subject, message, website }));
      this.sent.set(true);
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse && error.status === 429
          ? 'Trop de messages envoyés, réessayez dans quelques minutes.'
          : "Le message n'a pas pu être envoyé, réessayez plus tard.",
      );
    }
  }
}
