import { describe, expect, it } from 'vitest';
import fixtures from './nest-fixtures.json' with { type: 'json' };
import { hashPassword, verifyPassword } from '../src/auth/passwords.js';
import { decryptAesGcm, encryptAesGcm } from '../src/auth/crypto.js';

// Valeurs produites par l'API Nest (@node-rs/argon2, bcryptjs, node:crypto) : les données déjà
// en base doivent rester valides après la migration.
describe('compatibilité avec les données Nest', () => {
  it('verifies an argon2id hash made by @node-rs/argon2', async () => {
    expect(await verifyPassword(fixtures.argon2, 'Secret-123!')).toEqual({ valid: true, needsRehash: false });
    expect((await verifyPassword(fixtures.argon2, 'faux')).valid).toBe(false);
  });

  it.each([['bcrypt'], ['sha256']] as const)('accepts a legacy %s hash and asks for a rehash', async (kind) => {
    expect(await verifyPassword(fixtures[kind], 'Secret-123!')).toEqual({ valid: true, needsRehash: true });
  });

  it('hashes in argon2id with the OWASP parameters', async () => {
    const hash = await hashPassword('Neuf-456!');

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect((await verifyPassword(hash, 'Neuf-456!')).valid).toBe(true);
  });

  it('decrypts a TOTP secret encrypted by Nest and round-trips its own format', async () => {
    expect(await decryptAesGcm(fixtures.aesKey, fixtures.aes)).toBe('JBSWY3DPEHPK3PXP');
    const sealed = await encryptAesGcm(fixtures.aesKey, 'SECRET');
    expect(sealed.split(':')).toHaveLength(3);
    expect(await decryptAesGcm(fixtures.aesKey, sealed)).toBe('SECRET');
  });
});
