// Envoi d'emails, injecté par requête : SMTP en production (phase emails), faux en test.
export type Mailer = {
  sendVerificationCode(email: string, code: string): Promise<boolean>;
};

/** Développement local sans SMTP : le code s'affiche dans la console de `wrangler dev`. */
export const consoleMailer: Mailer = {
  async sendVerificationCode(email, code) {
    console.warn(`SMTP non configuré (dev) : code pour ${email} : ${code}`);
    return true;
  },
};
