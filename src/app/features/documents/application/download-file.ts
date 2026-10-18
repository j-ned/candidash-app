/**
 * Propose le fichier au téléchargement, sous le nom donné, sans quitter la page. Le lien passe par
 * le DOM et l'URL n'est libérée qu'au tour suivant : Firefox annule sinon le téléchargement.
 */
export function downloadFile(document: Document, blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url));
}
