import { maskEmail, type Transport } from './mailer.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

/** Clé d'API Resend et expéditeur : `from` est une adresse seule, sur un domaine vérifié chez Resend. */
export type ResendSettings = {
  readonly apiKey: string;
  readonly from: string;
  readonly fromName: string;
};

/**
 * Envoi par l'API HTTP de Resend : pas de connexion SMTP à ouvrir. Un refus ou une panne rend
 * `false`, comme le transport SMTP ; le journal garde le statut, jamais le destinataire en clair
 * ni le contenu (la réponse de Resend peut citer l'adresse).
 */
export function resendTransport(settings: ResendSettings, fetchFn: typeof fetch = fetch): Transport {
  const from = `${settings.fromName} <${settings.from}>`;

  return async ({ to, replyTo, subject, text, html }) => {
    try {
      const response = await fetchFn(RESEND_EMAILS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          subject,
          text,
          ...(html && { html }),
          ...(replyTo && { reply_to: `${replyTo.name} <${replyTo.email}>` }),
        }),
      });
      if (response.ok) return true;
      console.error(`Envoi d'email refusé par Resend (${response.status}) pour ${maskEmail(to)} — ${subject}`);
      return false;
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'erreur inconnue';
      console.error(`Resend injoignable (${reason}) pour ${maskEmail(to)} — ${subject}`);
      return false;
    }
  };
}
