import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { parseMarkdown } from '../../infra/parse-markdown';

/**
 * Aperçu du document sur une feuille A4, gabarit « sobre ». La feuille reste blanche en thème
 * sombre : c'est le rendu du PDF final. Les styles passent par des classes (variantes Tailwind sur
 * les descendants), jamais par du style inline : la CSP du site l'interdit.
 */
@Component({
  selector: 'app-document-sheet',
  host: {
    class:
      'mx-auto block aspect-[210/297] w-full max-w-[210mm] break-words bg-white px-[8%] py-[7%] text-[13px] leading-relaxed text-neutral-900 shadow-lg ring-1 ring-black/5 ' +
      '[&_.doc-h1]:mb-1 [&_.doc-h1]:text-2xl [&_.doc-h1]:font-bold [&_.doc-h1]:tracking-tight ' +
      '[&_.doc-h2]:mt-5 [&_.doc-h2]:mb-2 [&_.doc-h2]:border-b [&_.doc-h2]:border-neutral-300 [&_.doc-h2]:pb-1 [&_.doc-h2]:text-xs [&_.doc-h2]:font-semibold [&_.doc-h2]:uppercase [&_.doc-h2]:tracking-widest [&_.doc-h2]:text-neutral-700 ' +
      '[&_.doc-h3]:mt-3 [&_.doc-h3]:font-semibold [&_.doc-h4]:mt-2 [&_.doc-h4]:font-medium ' +
      '[&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 ' +
      '[&_a]:underline [&_hr]:my-4 [&_hr]:border-neutral-300 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:italic ' +
      '[&_code]:font-mono [&_code]:text-[0.9em] [&_table]:my-2 [&_td]:pr-3 [&_th]:pr-3 [&_th]:text-left',
  },
  template: `<div data-testid="document-preview" [innerHTML]="html()"></div>`,
})
export class DocumentSheet {
  private readonly sanitizer = inject(DomSanitizer);

  readonly markdown = input.required<string>();

  // parseMarkdown assainit (DOMPurify) : le HTML est digne de confiance à la sortie.
  protected readonly html = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(parseMarkdown(this.markdown())),
  );
}
