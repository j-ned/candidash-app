import {
  passwordChangedEmail,
  passwordResetEmail,
  reminderEmail,
  verificationEmail,
  type EmailContent,
  type ReminderEmailData,
} from './templates';

export type OutgoingEmail = EmailContent & { to: string; replyTo?: { name: string; email: string } };

/** Envoie un email ; false si l'envoi échoue (l'appelant décide si c'est bloquant). */
export type Transport = (email: OutgoingEmail) => Promise<boolean>;

// Envoi d'emails, injecté par requête : SMTP en production, console en local, faux en test.
export type Mailer = {
  sendVerificationCode(email: string, code: string): Promise<boolean>;
  sendPasswordReset(data: { email: string; userName?: string; resetUrl: string }): Promise<boolean>;
  sendPasswordChanged(data: { email: string; userName?: string }): Promise<boolean>;
  sendReminder(data: ReminderEmailData): Promise<boolean>;
  /** Formulaire de contact : texte brut uniquement, le message vient d'un visiteur. */
  sendContact(data: { to: string; name: string; email: string; subject: string; message: string }): Promise<boolean>;
};

export function templatedMailer(send: Transport): Mailer {
  return {
    sendVerificationCode: (email, code) => send({ to: email, ...verificationEmail(code) }),
    sendPasswordReset: ({ email, userName, resetUrl }) =>
      send({ to: email, ...passwordResetEmail({ userEmail: email, userName, resetUrl, resetToken: '' }) }),
    sendPasswordChanged: ({ email, userName }) =>
      send({ to: email, ...passwordChangedEmail({ userEmail: email, userName, changeDate: new Date() }) }),
    sendReminder: (data) => send({ to: data.userEmail, ...reminderEmail(data) }),
    sendContact: ({ to, name, email, subject, message }) =>
      send({
        to,
        replyTo: { name, email },
        subject: `[Candidash contact] ${subject}`,
        text: `De : ${name} <${email}>\n\n${message}`,
      }),
  };
}

/** Développement local sans SMTP : l'email (texte) s'affiche dans la console de `wrangler dev`. */
export const consoleMailer = templatedMailer(async ({ to, subject, text }) => {
  console.warn(`SMTP non configuré (dev) : email pour ${to} — ${subject}\n${text}`);
  return true;
});

/** Production sans SMTP : aucun code ni lien ne doit finir dans les logs, l'envoi échoue. */
export const unavailableMailer = templatedMailer(async () => false);
