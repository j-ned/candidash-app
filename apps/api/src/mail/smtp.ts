import nodemailer from 'nodemailer';
import type { Bindings } from '../env';
import type { Transport } from './mailer';

export type SmtpConfig = Pick<
  Bindings,
  'MAIL_HOST' | 'MAIL_PORT' | 'MAIL_USER' | 'MAIL_PASSWORD' | 'MAIL_FROM_NAME' | 'MAIL_FROM_ADDRESS'
>;

/** SMTP via nodemailer : 465 = TLS implicite, 587 = STARTTLS exigé (requireTLS), jamais en clair. */
export function smtpTransport(config: SmtpConfig): Transport {
  const port = Number(config.MAIL_PORT ?? 465);
  const transporter = nodemailer.createTransport({
    host: config.MAIL_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: config.MAIL_USER, pass: config.MAIL_PASSWORD },
  });
  const from = { name: config.MAIL_FROM_NAME ?? 'Candidash', address: config.MAIL_FROM_ADDRESS ?? config.MAIL_USER! };

  return async ({ to, replyTo, subject, text, html }) => {
    try {
      await transporter.sendMail({
        from,
        to,
        ...(replyTo && { replyTo: { name: replyTo.name, address: replyTo.email } }),
        subject,
        text,
        ...(html && { html }),
      });
      return true;
    } catch (error) {
      console.error(`Envoi d'email impossible (${subject})`, error);
      return false;
    }
  };
}
