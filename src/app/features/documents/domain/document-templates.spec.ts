import { starterDocument } from './document-templates';

const headings = (markdown: string): string[] =>
  markdown
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3));

describe('starterDocument', () => {
  it('Given a new CV When its starter is asked Then it is titled and holds the expected sections', () => {
    // Given / When
    const starter = starterDocument('CV');

    // Then
    expect(starter.title).toBe('Mon CV');
    expect(starter.markdown.startsWith('# ')).toBe(true);
    expect(headings(starter.markdown)).toEqual([
      'Coordonnées',
      'Profil',
      'Expérience',
      'Formation',
      'Compétences',
      'Langues',
    ]);
  });

  it('Given a new cover letter When its starter is asked Then it holds the parts of a French letter', () => {
    // Given / When
    const starter = starterDocument('LETTER');

    // Then
    expect(starter.title).toBe('Ma lettre de motivation');
    for (const part of ['Objet :', 'Madame, Monsieur,', 'Je vous prie d’agréer']) {
      expect(starter.markdown).toContain(part);
    }
  });
});
