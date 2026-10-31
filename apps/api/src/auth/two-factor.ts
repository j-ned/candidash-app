import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { users, type UserRow } from '../db/schema.js';
import { decryptAesGcm, encryptAesGcm, randomHex } from './crypto.js';

const TOTP = { issuer: 'CandiDash', algorithm: 'SHA1', digits: 6, period: 30 } as const;

/** Nouveau secret chiffré en base ; la 2FA ne s'active qu'après un premier code valide. */
export async function startTotpSetup(db: Db, user: UserRow, key: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const otpauthUri = new OTPAuth.TOTP({ ...TOTP, label: user.email, secret }).toString();
  // SVG plutôt que PNG : pas de dépendance à zlib, et une image nette à toute taille
  const svg = await QRCode.toString(otpauthUri, { type: 'svg' });

  await db
    .update(users)
    .set({ totpSecret: await encryptAesGcm(key, secret.base32), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return { qrCodeDataUri: `data:image/svg+xml;base64,${btoa(svg)}`, otpauthUri };
}

export async function verifyTotp(encryptedSecret: string, token: string, key: string): Promise<boolean> {
  const totp = new OTPAuth.TOTP({ ...TOTP, secret: OTPAuth.Secret.fromBase32(await decryptAesGcm(key, encryptedSecret)) });
  return totp.validate({ token, window: 1 }) !== null;
}

/** Active la 2FA et renvoie 8 codes de récupération en clair, une seule fois (stockés hachés). */
export async function enableTotp(db: Db, userId: string): Promise<string[]> {
  const codes = Array.from({ length: 8 }, () => {
    const hex = randomHex(6);
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  });
  // bcrypt comme l'API Nest : les codes déjà émis restent valides après la migration
  const hashed = await Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
  await db
    .update(users)
    .set({ totpEnabled: true, totpRecoveryCodes: hashed, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return codes;
}

export async function disableTotp(db: Db, userId: string): Promise<void> {
  await db
    .update(users)
    .set({ totpSecret: null, totpEnabled: false, totpRecoveryCodes: [], updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** Consomme un code de récupération : vrai s'il était valide, et il ne resservira pas. */
export async function consumeRecoveryCode(db: Db, user: UserRow, code: string): Promise<boolean> {
  for (const [index, hashed] of user.totpRecoveryCodes.entries()) {
    if (await bcrypt.compare(code, hashed)) {
      await db
        .update(users)
        .set({ totpRecoveryCodes: user.totpRecoveryCodes.toSpliced(index, 1), updatedAt: new Date() })
        .where(eq(users.id, user.id));
      return true;
    }
  }
  return false;
}
