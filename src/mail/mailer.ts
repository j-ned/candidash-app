// Envoi d'emails, injecté par requête : SMTP en production (phase emails), faux en test.
// Chaque méthode renvoie false si l'envoi échoue : l'appelant décide si c'est bloquant.
export type Mailer = {
  sendVerificationCode(email: string, code: string): Promise<boolean>;
  sendPasswordReset(data: { email: string; userName?: string; resetUrl: string }): Promise<boolean>;
  sendPasswordChanged(data: { email: string; userName?: string }): Promise<boolean>;
};

/** Développement local sans SMTP : le contenu utile s'affiche dans la console de `wrangler dev`. */
export const consoleMailer: Mailer = {
  async sendVerificationCode(email, code) {
    console.warn(`SMTP non configuré (dev) : code pour ${email} : ${code}`);
    return true;
  },
  async sendPasswordReset({ email, resetUrl }) {
    console.warn(`SMTP non configuré (dev) : réinitialisation pour ${email} : ${resetUrl}`);
    return true;
  },
  async sendPasswordChanged({ email }) {
    console.warn(`SMTP non configuré (dev) : mot de passe changé pour ${email}`);
    return true;
  },
};

/** Production sans SMTP branché : aucun lien ni code ne doit finir dans les logs. */
export const unavailableMailer: Mailer = {
  sendVerificationCode: async () => false,
  sendPasswordReset: async () => false,
  sendPasswordChanged: async () => false,
};
