import { Injectable } from '@angular/core';
import type { PdfTextItem } from '../domain/pdf-to-markdown';

/** Au-delà, l'extraction resterait longue pour un document qui n'est pas un CV. */
export const PDF_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const PDF_IMPORT_MAX_PAGES = 10;

/**
 * Lecture du texte d'un PDF dans le navigateur, par pdf.js chargé à la demande. Le worker est
 * empaqueté par le build (nom haché, servi depuis le site) : compatible avec la CSP. Rien ne
 * quitte le navigateur.
 */
@Injectable({ providedIn: 'root' })
export class PdfTextReader {
  async read(file: Blob): Promise<PdfTextItem[][]> {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerPort ??= new Worker(new URL('./pdf.worker', import.meta.url), {
      type: 'module',
    });
    // Pas de WebAssembly (décodeurs d'images, inutiles pour le texte) : la CSP ne l'autorise pas.
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      useWasm: false,
    });
    try {
      const pdf = await task.promise;
      const pages: PdfTextItem[][] = [];
      for (let number = 1; number <= Math.min(pdf.numPages, PDF_IMPORT_MAX_PAGES); number++) {
        const content = await (await pdf.getPage(number)).getTextContent();
        pages.push(
          content.items.flatMap((item) =>
            'str' in item
              ? [
                  {
                    text: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    fontSize: Math.hypot(item.transform[2], item.transform[3]),
                  },
                ]
              : [],
          ),
        );
      }
      return pages;
    } finally {
      await task.destroy();
    }
  }
}
