import { parseMarkdown } from './parse-markdown';

const fragment = (html: string): HTMLElement => {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
};

describe('parseMarkdown', () => {
  it('Given a CV in Markdown When rendered Then titles, lists and emphasis become HTML', () => {
    // Given
    const markdown = '# Camille Martin\n\n## Expérience\n\n- **Angular** 22\n- *NestJS*';

    // When
    const html = fragment(parseMarkdown(markdown));

    // Then
    expect({
      name: html.querySelector('h2')?.textContent,
      section: html.querySelector('h3')?.textContent,
      items: [...html.querySelectorAll('li')].map((item) => item.innerHTML),
    }).toEqual({
      name: 'Camille Martin',
      section: 'Expérience',
      items: ['<strong>Angular</strong> 22', '<em>NestJS</em>'],
    });
  });

  it('Given titles When rendered Then no h1 is produced (the page keeps its own) and each title keeps its Markdown depth as a class', () => {
    // Given / When
    const html = fragment(parseMarkdown('# Nom\n\n## Profil\n\n### Détail'));

    // Then
    expect(
      [...html.querySelectorAll('h1, h2, h3, h4')].map((heading) => [
        heading.tagName,
        heading.className,
      ]),
    ).toEqual([
      ['H2', 'doc-h1'],
      ['H3', 'doc-h2'],
      ['H4', 'doc-h3'],
    ]);
  });

  it('Given a document without a level-1 title When rendered Then its titles keep their level', () => {
    // Given / When
    const html = fragment(parseMarkdown('## Profil'));

    // Then
    expect(html.querySelector('h2')?.className).toBe('doc-h2');
  });

  it('Given address lines separated by a single newline When rendered Then each line stays on its own (letters)', () => {
    // Given / When
    const html = fragment(parseMarkdown('Camille Martin\n12 rue des Lilas\n44000 Nantes'));

    // Then
    expect(html.querySelectorAll('p br').length).toBe(2);
  });

  it.each([
    { case: 'a script element', markdown: 'Texte <script>alert(1)</script>', forbidden: 'script' },
    {
      case: 'a style element',
      markdown: '<style>body{display:none}</style>\n\nTexte',
      forbidden: 'style',
    },
    {
      case: 'a style attribute',
      markdown: "<p style='position:fixed'>Texte</p>",
      forbidden: '[style]',
    },
    {
      case: 'an event handler',
      markdown: '<img src="x" onerror="alert(1)">',
      forbidden: '[onerror]',
    },
    {
      case: 'a javascript: link',
      markdown: '[clic](javascript:alert(1))',
      forbidden: 'a[href^="javascript"]',
    },
    {
      case: 'a form control',
      markdown: '<form><input name="x"><button>Envoyer</button></form>',
      forbidden: 'form, input, button',
    },
  ])('Given $case When rendered Then it is stripped (CSP and XSS)', ({ markdown, forbidden }) => {
    // Given / When
    const html = parseMarkdown(markdown);

    // Then
    expect(fragment(html).querySelector(forbidden)).toBeNull();
    expect(html).not.toContain('alert(1)');
  });
});
