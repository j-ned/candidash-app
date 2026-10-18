import { offerKeywords, keywordCoverage } from './offer-keywords';

const OFFER = `Nous recherchons un développeur Angular confirmé pour rejoindre notre équipe.
Vous maîtrisez Angular, TypeScript et RxJS. Une expérience de NestJS et de PostgreSQL est un plus.
Vous travaillez en méthode Agile (Scrum), avec des tests automatisés (Jest ou Cypress) et Docker.
Le poste est basé à Nantes. Angular et TypeScript sont au cœur de la mission.`;

describe('offerKeywords', () => {
  it('extracts the known skills of the offer, most cited first', () => {
    // When
    const keywords = offerKeywords(OFFER);

    // Then
    expect(keywords.slice(0, 2)).toEqual(['Angular', 'TypeScript']);
    expect(keywords).toEqual(
      expect.arrayContaining([
        'RxJS',
        'NestJS',
        'PostgreSQL',
        'Agile',
        'Scrum',
        'Jest',
        'Cypress',
        'Docker',
      ]),
    );
  });

  it('leaves out the words every job ad uses', () => {
    // When
    const keywords = offerKeywords(OFFER).map((keyword) => keyword.toLowerCase());

    // Then
    for (const word of ['poste', 'mission', 'équipe', 'expérience', 'vous', 'nous']) {
      expect(keywords).not.toContain(word);
    }
  });

  it('keeps a domain word repeated in the offer even if it is not a known skill', () => {
    // Given
    const offer =
      'Gestion de la paie et de la comptabilité. La paie représente 50 % du poste, la comptabilité le reste.';

    // When / Then
    expect(offerKeywords(offer)).toEqual(expect.arrayContaining(['paie', 'comptabilité']));
  });

  it.each([
    ['C#', 'Développeur C# / .NET confirmé, C# au quotidien', ['C#', '.NET']],
    ['Node.js', 'Back-end en Node.js et CI/CD GitLab', ['Node.js', 'CI/CD', 'GitLab']],
  ])('recognises skills written with symbols (%s)', (_case, offer, expected) => {
    expect(offerKeywords(offer)).toEqual(expect.arrayContaining(expected));
  });

  it('returns nothing for an empty offer', () => {
    expect(offerKeywords('   ')).toEqual([]);
  });
});

describe('keywordCoverage', () => {
  it('splits the keywords between present and missing, ignoring case and accents', () => {
    // Given
    const document = '# Camille\n\n- angular 22 et Typescript\n- Accessibilite RGAA';

    // When
    const coverage = keywordCoverage(
      ['Angular', 'TypeScript', 'NestJS', 'accessibilité'],
      document,
    );

    // Then
    expect(coverage).toEqual({
      present: ['Angular', 'TypeScript', 'accessibilité'],
      missing: ['NestJS'],
      score: 75,
    });
  });

  it('does not match a keyword inside another word', () => {
    // Given / When
    const coverage = keywordCoverage(['Java', 'Go'], 'JavaScript, Google');

    // Then
    expect(coverage.missing).toEqual(['Java', 'Go']);
  });

  it('has a null score without keywords', () => {
    expect(keywordCoverage([], 'texte').score).toBeNull();
  });
});
