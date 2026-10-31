/**
 * Nom de fichier d'un document, proposé par « Enregistrer en PDF » (le navigateur reprend le titre
 * de la page) : « CV Développeur Angular — Acme » → « cv-developpeur-angular-acme ».
 */
export function documentFileName(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return slug || 'document';
}
