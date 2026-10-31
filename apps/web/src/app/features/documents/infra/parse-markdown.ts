import DOMPurify from 'dompurify';
import { Marked, type Tokens } from 'marked';

// La CSP du site refuse le style inline : ni attribut `style`, ni élément `<style>` dans l'aperçu.
// Les contrôles de formulaire n'ont rien à faire dans un CV, et un <button> soumettrait le
// formulaire de l'éditeur qui entoure l'aperçu.
const SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true },
  FORBID_ATTR: ['style'],
  FORBID_TAGS: ['style', 'form', 'input', 'button', 'select', 'textarea'],
};

// La page de l'éditeur porte le seul <h1> : le titre le plus haut du document devient un <h2>.
// La profondeur Markdown reste lisible en classe (`doc-h1`…) pour la mise en page de la feuille.
const TOP_HEADING_LEVEL = 2;

// État de l'appel en cours : `parse` est synchrone et `walkTokens` parcourt tout avant le rendu.
let highestHeadingDepth = 6;

const marked = new Marked({
  gfm: true,
  // Un retour à la ligne simple reste un retour à la ligne : adresses, coordonnées, signature.
  breaks: true,
  hooks: {
    preprocess(markdown: string): string {
      highestHeadingDepth = 6;
      return markdown;
    },
  },
  walkTokens(token): void {
    if (token.type === 'heading') highestHeadingDepth = Math.min(highestHeadingDepth, token.depth);
  },
  renderer: {
    heading({ tokens, depth }: Tokens.Heading): string {
      const shift = Math.max(0, TOP_HEADING_LEVEL - highestHeadingDepth);
      const level = Math.min(depth + shift, 6);
      return `<h${level} class="doc-h${depth}">${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
  },
});

/**
 * Markdown → HTML **assaini**. marked laisse passer le HTML inline tel quel : c'est ici, et
 * seulement ici, que le HTML devient digne de confiance pour `bypassSecurityTrustHtml`.
 * Sans DOM (rendu serveur), DOMPurify ne filtre rien : on ne rend alors rien plutôt que du brut.
 */
export function parseMarkdown(markdown: string): string {
  if (!DOMPurify.isSupported) return '';
  const html = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(html, SANITIZE_OPTIONS);
}
