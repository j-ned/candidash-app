/** Minuscules sans accents : « Accessibilité » et « accessibilite » se comparent à égalité. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Le terme en mot entier (ni « Java » dans « JavaScript », ni « Go » dans « Google »). */
export function wholeTerm(term: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(normalizeText(term))}(?![\\p{L}\\p{N}])`,
    'gu',
  );
}
