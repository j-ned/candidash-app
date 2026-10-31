import { argon2idAsync } from '@noble/hashes/argon2.js';
import bcrypt from 'bcryptjs';
import { sha256Hex, timingSafeEqualHex } from './crypto.js';

// Paramètres minimaux recommandés par l'OWASP pour argon2id (19 Mio, 2 passes, 1 fil), identiques
// à ceux de l'API Nest : les hachages déjà en base se vérifient sans changement. Argon2 en JS pur
// (@noble/hashes) : Workers interdit de compiler du WASM à l'exécution. ~300 ms de CPU par calcul,
// seulement à la connexion, à l'inscription et au changement de mot de passe.
const ARGON2ID = { m: 19456, t: 2, p: 1 };
const HASH_LENGTH = 32;

const ARGON2ID_PREFIX = '$argon2id$';
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

export type PasswordCheck = {
  valid: boolean;
  /** Mot de passe correct mais haché avec un ancien algorithme : à re-hacher en argon2id. */
  needsRehash: boolean;
};

const INVALID: PasswordCheck = { valid: false, needsRehash: false };

// Format PHC, celui de @node-rs/argon2 : $argon2id$v=19$m=…,t=…,p=…$sel$hachage (base64 sans `=`)
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=+$/, '');
const unb64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await argon2idAsync(password, salt, { ...ARGON2ID, dkLen: HASH_LENGTH });
  const { m, t, p } = ARGON2ID;
  return `$argon2id$v=19$m=${m},t=${t},p=${p}$${b64(salt)}$${b64(hash)}`;
}

async function verifyArgon2id(stored: string, password: string): Promise<boolean> {
  const [, m, t, p, salt, hash] = stored.match(PHC) ?? [];
  if (!m || !t || !p || !salt || !hash) return false;
  const expected = unb64(hash);
  const actual = await argon2idAsync(password, unb64(salt), {
    m: Number(m),
    t: Number(t),
    p: Number(p),
    dkLen: expected.length,
  });
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) diff |= (actual[i] ?? 0) ^ expected[i]!;
  return diff === 0;
}

/** Vérifie argon2id, et les anciens hachages bcrypt et SHA-256 pour la migration progressive. */
export async function verifyPassword(stored: string, password: string): Promise<PasswordCheck> {
  try {
    if (stored.startsWith(ARGON2ID_PREFIX)) {
      return { valid: await verifyArgon2id(stored, password), needsRehash: false };
    }
    if (BCRYPT_HASH.test(stored)) {
      return (await bcrypt.compare(password, stored)) ? { valid: true, needsRehash: true } : INVALID;
    }
    if (SHA256_HEX.test(stored)) {
      const valid = timingSafeEqualHex(await sha256Hex(password), stored);
      return valid ? { valid: true, needsRehash: true } : INVALID;
    }
  } catch {
    // Hachage stocké illisible : traité comme un échec, jamais comme une erreur 500
  }
  return INVALID;
}
