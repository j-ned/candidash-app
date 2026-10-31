import { pdfToMarkdown, type PdfTextItem } from './pdf-to-markdown';

/** Ligne de texte d'une page : `y` part du bas de la page, comme dans un PDF. */
function line(text: string, y: number, fontSize = 10, x = 50): PdfTextItem {
  return { text, x, y, fontSize };
}

describe('pdfToMarkdown', () => {
  it('turns the largest line into the title and larger lines into sections', () => {
    // Given
    const page = [
      line('Camille Martin', 800, 22),
      line('Développeuse Angular', 780),
      line('Expérience', 740, 13),
      line('Acme Software, 2022 – 2026', 720),
    ];

    // When / Then
    expect(pdfToMarkdown([page])).toBe(
      '# Camille Martin\n\nDéveloppeuse Angular\n\n## Expérience\n\nAcme Software, 2022 – 2026',
    );
  });

  it('keeps consecutive lines in the same block and splits blocks on a wide gap', () => {
    // Given
    const page = [
      line('12 rue des Lilas', 800),
      line('44000 Nantes', 788),
      line('Madame, Monsieur,', 750),
    ];

    // When / Then
    expect(pdfToMarkdown([page])).toBe('12 rue des Lilas\n44000 Nantes\n\nMadame, Monsieur,');
  });

  it('rebuilds a line from items placed side by side, in reading order', () => {
    // Given
    const page = [line('NestJS', 700, 10, 120), line('Angular,', 700, 10, 50)];

    // When / Then
    expect(pdfToMarkdown([page])).toBe('Angular, NestJS');
  });

  it.each(['•', '◦', '▪', '●', '-', '–', '*'])(
    'turns a line starting with %s into a list item',
    (bullet) => {
      // Given
      const page = [line(`${bullet} Angular 22`, 700), line(`${bullet}Tests Vitest`, 688)];

      // When / Then
      expect(pdfToMarkdown([page])).toBe('- Angular 22\n- Tests Vitest');
    },
  );

  it('joins the wrapped end of a list item, indented under its text', () => {
    // Given
    const page = [
      line('• Migration de 120 écrans', 700, 10, 50),
      line('vers Angular 22', 688, 10, 60),
      line('• Tests Vitest', 676, 10, 50),
    ];

    // When / Then
    expect(pdfToMarkdown([page])).toBe('- Migration de 120 écrans vers Angular 22\n- Tests Vitest');
  });

  it('separates the list from the paragraph that follows', () => {
    // Given
    const page = [line('• Angular', 700), line('Disponible immédiatement', 688)];

    // When / Then
    expect(pdfToMarkdown([page])).toBe('- Angular\n\nDisponible immédiatement');
  });

  it('reads the pages one after the other', () => {
    // Given
    const first = [line('Page une', 100)];
    const second = [line('Page deux', 800)];

    // When / Then
    expect(pdfToMarkdown([first, second])).toBe('Page une\n\nPage deux');
  });

  it('ignores empty items and returns nothing for a PDF without text (scan)', () => {
    // Given / When / Then
    expect(pdfToMarkdown([[line('   ', 700)], []])).toBe('');
  });

  it('escapes Markdown characters found in the text', () => {
    // Given
    const page = [line('# 1 en C#', 700), line('Score : 4 * 5', 688)];

    // When / Then
    expect(pdfToMarkdown([page])).toBe('\\# 1 en C#\nScore : 4 \\* 5');
  });

  it('rebuilds a CV printed by Chromium: capitalised sections, indented items without bullet glyphs', () => {
    // Given : texte réel d'un CV exporté par Candidash (Gotenberg), lu par pdf.js
    const page: PdfTextItem[] = [
      { text: 'Camille Martin', x: 47.2, y: 781.9, fontSize: 18 },
      { text: 'Développeuse Angular — Nantes', x: 47.2, y: 760.2, fontSize: 9.7 },
      {
        text: 'camille.martin@exemple.fr · 06 12 34 56 78 · portfolio',
        x: 47.2,
        y: 744.4,
        fontSize: 9.7,
      },
      { text: 'EXPÉRIENCE', x: 47.2, y: 715.9, fontSize: 9 },
      {
        text: 'Développeuse Angular — Acme Software (2022 – 2026)',
        x: 47.2,
        y: 688.9,
        fontSize: 9.7,
      },
      {
        text: "Migration d'une application de 120 écrans vers Angular 22 et les signals",
        x: 62.2,
        y: 668.7,
        fontSize: 9.7,
      },
      {
        text: 'Mise en place des tests Vitest : couverture passée de 35 % à 82 %',
        x: 62.2,
        y: 650.7,
        fontSize: 9.7,
      },
      {
        text: 'Accessibilité RGAA : audit et corrections, zéro violation axe en CI',
        x: 62.2,
        y: 633.4,
        fontSize: 9.7,
      },
      {
        text: 'Développeuse front-end — Studio Nord (2019 – 2022)',
        x: 47.2,
        y: 608.7,
        fontSize: 9.7,
      },
      { text: 'Intégration de maquettes Figma en Tailwind CSS', x: 62.2, y: 588.4, fontSize: 9.7 },
      {
        text: 'API NestJS et PostgreSQL pour un back-office de réservation',
        x: 62.2,
        y: 571.2,
        fontSize: 9.7,
      },
      { text: 'FORMATION', x: 47.2, y: 542.7, fontSize: 9 },
      {
        text: 'Master informatique — Université de Nantes (2019)',
        x: 62.2,
        y: 518.7,
        fontSize: 9.7,
      },
      { text: 'COMPÉTENCES', x: 47.2, y: 490.2, fontSize: 9 },
      { text: 'Front', x: 47.2, y: 466.2, fontSize: 9.7 },
      { text: ': Angular, TypeScript, RxJS, Tailwind CSS', x: 74.9, y: 466.2, fontSize: 9.7 },
      { text: 'Back', x: 47.2, y: 450.4, fontSize: 9.7 },
      { text: ': NestJS, PostgreSQL, Drizzle', x: 73.3, y: 450.4, fontSize: 9.7 },
      { text: 'Outils', x: 47.2, y: 433.9, fontSize: 9.7 },
      { text: ': Git, Docker, GitHub Actions', x: 77.6, y: 433.9, fontSize: 9.7 },
    ];

    // When / Then
    expect(pdfToMarkdown([page])).toBe(
      [
        '# Camille Martin',
        'Développeuse Angular — Nantes\ncamille.martin@exemple.fr · 06 12 34 56 78 · portfolio',
        '## EXPÉRIENCE',
        'Développeuse Angular — Acme Software (2022 – 2026)',
        "- Migration d'une application de 120 écrans vers Angular 22 et les signals\n- Mise en place des tests Vitest : couverture passée de 35 % à 82 %\n- Accessibilité RGAA : audit et corrections, zéro violation axe en CI",
        'Développeuse front-end — Studio Nord (2019 – 2022)',
        '- Intégration de maquettes Figma en Tailwind CSS\n- API NestJS et PostgreSQL pour un back-office de réservation',
        '## FORMATION',
        '- Master informatique — Université de Nantes (2019)',
        '## COMPÉTENCES',
        'Front : Angular, TypeScript, RxJS, Tailwind CSS\nBack : NestJS, PostgreSQL, Drizzle\nOutils : Git, Docker, GitHub Actions',
      ].join('\n\n'),
    );
  });
});
