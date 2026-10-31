// Primitives Web Crypto : identiques sous Workers et sous Node (tests).

const encoder = new TextEncoder();

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(hex.match(/../g) ?? [], (byte) => parseInt(byte, 16));
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export function randomHex(byteLength: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** SHA-256 en hex : jetons aléatoires à forte entropie (refresh, reset, jetons d'API). */
export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

/** Comparaison en temps constant de deux chaînes hex de même longueur. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// AES-256-GCM au format de l'API Nest (`iv:tag:chiffré`, en base64) : les secrets TOTP déjà
// chiffrés en base restent lisibles. Web Crypto colle le tag de 16 octets en fin de chiffré.
const TAG_LENGTH = 16;

function aesKey(hexKey: string, usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromHex(hexKey), 'AES-GCM', false, [usage]);
}

export async function encryptAesGcm(hexKey: string, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(hexKey, 'encrypt'), encoder.encode(plaintext)),
  );
  const encrypted = sealed.slice(0, -TAG_LENGTH);
  const tag = sealed.slice(-TAG_LENGTH);
  return `${toBase64(iv)}:${toBase64(tag)}:${toBase64(encrypted)}`;
}

export async function decryptAesGcm(hexKey: string, ciphertext: string): Promise<string> {
  const [iv, tag, encrypted] = ciphertext.split(':').map(fromBase64);
  if (!iv || !tag || !encrypted) throw new Error('Chiffré illisible');
  const sealed = new Uint8Array(encrypted.length + tag.length);
  sealed.set(encrypted);
  sealed.set(tag, encrypted.length);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await aesKey(hexKey, 'decrypt'), sealed);
  return new TextDecoder().decode(plain);
}
