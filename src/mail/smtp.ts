import type { Bindings } from '../env';
import type { Transport } from './mailer';

export type SmtpConfig = Pick<
  Bindings,
  'MAIL_HOST' | 'MAIL_PORT' | 'MAIL_USER' | 'MAIL_PASSWORD' | 'MAIL_FROM_NAME' | 'MAIL_FROM_ADDRESS'
>;

/**
 * SMTP depuis un Worker (sockets TCP de Cloudflare), en TLS implicite seulement (port 465) : le
 * certificat est validé par le runtime. Pas de 587 : worker-mailer repasse en clair si le serveur
 * n'annonce pas STARTTLS (vérifié), identifiants compris. Le module n'existe que sous Workers : il
 * est chargé à l'envoi, pas à l'import (les tests tournent sous Node).
 */
export function smtpTransport(config: SmtpConfig): Transport {
  const port = Number(config.MAIL_PORT ?? 465);
  return async ({ to, replyTo, subject, text, html }) => {
    if (port !== 465) {
      console.error(`SMTP refusé : port ${port}, seul le TLS implicite (465) est accepté`);
      return false;
    }
    try {
      const { WorkerMailer } = await import('worker-mailer');
      await WorkerMailer.send(
        {
          host: config.MAIL_HOST!,
          port,
          secure: true,
          startTls: false,
          credentials: { username: config.MAIL_USER!, password: config.MAIL_PASSWORD! },
          authType: ['plain', 'login'],
        },
        {
          from: { name: config.MAIL_FROM_NAME ?? 'Candidash', email: config.MAIL_FROM_ADDRESS ?? config.MAIL_USER! },
          to,
          ...(replyTo && { reply: replyTo }),
          subject,
          text,
          ...(html && { html }),
        },
      );
      return true;
    } catch (error) {
      console.error(`Envoi d'email impossible (${subject})`, error);
      return false;
    }
  };
}
