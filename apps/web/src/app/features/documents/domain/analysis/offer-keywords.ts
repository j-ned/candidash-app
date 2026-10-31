import { KNOWN_SKILLS } from './known-skills';
import { normalizeText, wholeTerm } from './normalize-text';

export type KeywordCoverage = {
  readonly present: readonly string[];
  readonly missing: readonly string[];
  /** Part des mots-clés présents, en pourcentage ; null sans mot-clé. */
  readonly score: number | null;
};

const MAX_KEYWORDS = 20;
// Un mot hors liste doit revenir au moins deux fois dans l'offre pour compter
const MIN_REPEATS = 2;
const MIN_WORD_LENGTH = 4;

// Mots outils, vocabulaire et verbes d'action communs à toutes les offres : ils ne disent rien
// du poste (« faire évoluer », « participer aux rituels »).
const STOP_WORDS = new Set(
  `nous vous notre votre nos vos pour avec dans sans sous chez entre plus moins tres etre avoir
  sont sera seront etes avez avons fait faire cette celle ceux leurs leur tout tous toute toutes
  bien aussi comme dont mais donc alors ainsi afin sein autres autre egalement notamment idealement
  poste postes mission missions profil equipe equipes entreprise societe client clients experience
  experiences travail travaillez travailler rejoindre rejoignez recherchons recherche candidat
  candidate candidature connaissance connaissances maitrise maitrisez maitriser competence
  competences capacite capacites environnement projet projets annee annees niveau cadre confirme
  confirmee junior senior salaire remuneration avantages teletravail base basee reste represente
  quotidien coeur methode methodes tests offre offres developpeur developpeuse developpement
  application applications technique techniques technologies solutions outils qualite services
  service groupe secteur domaine activite activites contrat temps plein partiel date debut selon
  etc this that with from your will have work team role
  evoluer participer concevoir developper realiser assurer garantir accompagner contribuer
  integrer maintenir piloter mettre proposer offrir permettre apprendre animer suivre definir
  analyser ecrire gerer porter prendre`.split(/\s+/),
);

function countMatches(pattern: RegExp, text: string): { count: number; first: number } {
  const matches = [...text.matchAll(pattern)];
  return { count: matches.length, first: matches[0]?.index ?? Infinity };
}

/**
 * Mots-clés d'une offre, du plus cité au moins cité : les compétences connues d'abord, puis les
 * mots répétés du métier (« paie », « comptabilité »). Aucune donnée ne sort du navigateur.
 */
export function offerKeywords(offerText: string): string[] {
  const text = normalizeText(offerText);
  if (!text.trim()) return [];

  const skills = KNOWN_SKILLS.map((skill) => ({
    term: skill,
    ...countMatches(wholeTerm(skill), text),
  }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count || a.first - b.first);
  const skillWords = new Set(skills.flatMap(({ term }) => normalizeText(term).split(/\W+/)));

  const words = new Map<string, { term: string; count: number; first: number }>();
  for (const match of offerText.matchAll(/\p{L}[\p{L}'’-]*/gu)) {
    const term = match[0];
    const key = normalizeText(term);
    if (key.length < MIN_WORD_LENGTH || STOP_WORDS.has(key) || skillWords.has(key)) continue;
    const entry = words.get(key);
    if (entry) entry.count++;
    else words.set(key, { term, count: 1, first: match.index });
  }
  const domainWords = [...words.values()]
    .filter(({ count }) => count >= MIN_REPEATS)
    .sort((a, b) => b.count - a.count || a.first - b.first);

  return [...skills, ...domainWords].slice(0, MAX_KEYWORDS).map(({ term }) => term);
}

/** Mots-clés de l'offre présents ou absents du document (casse et accents ignorés). */
export function keywordCoverage(keywords: readonly string[], document: string): KeywordCoverage {
  const text = normalizeText(document);
  const present = keywords.filter((keyword) => wholeTerm(keyword).test(text));
  const missing = keywords.filter((keyword) => !present.includes(keyword));
  return {
    present,
    missing,
    score: keywords.length === 0 ? null : Math.round((present.length / keywords.length) * 100),
  };
}
