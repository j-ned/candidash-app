import { documentFileName } from './document-file-name';

describe('documentFileName', () => {
  it.each([
    ['CV Développeur Angular — Acme', 'cv-developpeur-angular-acme'],
    ['  Lettre : Ça va ?  ', 'lettre-ca-va'],
    ['***', 'document'],
  ])('turns "%s" into "%s"', (title, expected) => {
    expect(documentFileName(title)).toBe(expected);
  });

  it('caps the name at 80 characters without a trailing dash', () => {
    const name = documentFileName(`${'a'.repeat(79)} bcd`);

    expect(name.length).toBeLessThanOrEqual(80);
    expect(name.endsWith('-')).toBe(false);
  });
});
