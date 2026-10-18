import { documentChecks, type DocumentCheck } from './document-checks';

const CV = `# Camille Martin
camille.martin@exemple.fr · 06 12 34 56 78

## Expérience
### Développeuse Angular — Acme (2022 – 2026)
- Migration vers Angular 22

## Formation
- Master informatique (2019)

## Compétences
Angular, TypeScript, NestJS`;

function failing(checks: readonly DocumentCheck[]): string[] {
  return checks.filter((check) => !check.ok).map((check) => check.id);
}

describe('documentChecks', () => {
  describe('CV', () => {
    it('passes a CV with contact details, the expected sections and a single date format', () => {
      // When
      const checks = documentChecks('CV', CV);

      // Then
      expect(failing(checks)).toEqual(['length']);
      expect(checks.every((check) => check.title && check.tip)).toBe(true);
    });

    it.each([
      ['contact', CV.replace('camille.martin@exemple.fr · 06 12 34 56 78', 'Nantes')],
      ['experience', CV.replace('## Expérience', '## Parcours')],
      ['education', CV.replace('## Formation', '## Divers')],
      ['skills', CV.replace('## Compétences', '## Atouts')],
    ])('flags a missing %s', (id, markdown) => {
      expect(failing(documentChecks('CV', markdown))).toContain(id);
    });

    it.each([
      ['tables', `${CV}\n\n| Langue | Niveau |\n|---|---|\n| Anglais | B2 |`],
      ['images', `${CV}\n\n![photo](photo.png)`],
      ['dates', `${CV}\n\n### Stage — Studio (03/2018 – 09/2018)`],
    ])('flags what ATS read badly: %s', (id, markdown) => {
      expect(failing(documentChecks('CV', markdown))).toContain(id);
    });

    it.each([
      [80, 'length'],
      [500, null],
      [1200, 'length'],
    ])('estimates the length (%i words)', (words, flagged) => {
      // Given
      const markdown = `${CV}\n\n${'mot '.repeat(words)}`;

      // When
      const result = failing(documentChecks('CV', markdown)).includes('length');

      // Then
      expect(result).toBe(flagged !== null);
    });
  });

  describe('letter', () => {
    const LETTER = `Camille Martin
camille.martin@exemple.fr

Objet : candidature au poste de développeuse Angular

Madame, Monsieur,

${'Votre offre a retenu toute mon attention. '.repeat(40)}

Je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.`;

    it('passes a letter with a subject, a greeting, a closing and 250 to 450 words', () => {
      expect(failing(documentChecks('LETTER', LETTER))).toEqual([]);
    });

    it.each([
      ['subject', LETTER.replace('Objet : candidature au poste de développeuse Angular', '')],
      ['greeting', LETTER.replace('Madame, Monsieur,\n', '')],
      [
        'closing',
        LETTER.replace("Je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.", ''),
      ],
      [
        'length',
        LETTER.replace('Votre offre a retenu toute mon attention. '.repeat(40), 'Bonjour.'),
      ],
    ])('flags a missing or wrong %s', (id, markdown) => {
      expect(failing(documentChecks('LETTER', markdown))).toContain(id);
    });
  });
});
