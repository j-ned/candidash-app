const FALLBACK = 'document.pdf';

/** Nom de fichier d'un en-tête `Content-Disposition`, sans chemin (le navigateur l'assainit aussi). */
export function fileNameFromDisposition(header: string | null): string {
  const match = header?.match(/filename="?([^";]+)"?/i);
  const name = match?.[1].split(/[\\/]/).pop()?.trim();
  if (!name) return FALLBACK;
  return name;
}
