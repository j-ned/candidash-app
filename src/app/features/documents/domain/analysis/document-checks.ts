import type { DocumentKind } from '../models/document.model';

export type CheckCategory = 'structure' | 'ats';

export type DocumentCheck = {
  readonly id: string;
  readonly category: CheckCategory;
  readonly ok: boolean;
  readonly title: string;
  /** Conseil affiché quand le contrôle échoue. */
  readonly tip: string;
};

type CheckRule = Omit<DocumentCheck, 'ok'> & { readonly passes: (markdown: string) => boolean };

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/;
const heading = (pattern: string): RegExp => new RegExp(`^#{1,6}\\s.*(?:${pattern})`, 'imu');

// Un CV tient en une à deux pages : environ 450 mots par page dense
const CV_WORDS = { min: 150, max: 900 } as const;
const LETTER_WORDS = { min: 250, max: 450 } as const;

const MONTHS =
  'janvier|janv\\.?|f[ée]vrier|f[ée]vr?\\.?|mars|avril|avr\\.?|mai|juin|juillet|juil\\.?|ao[uû]t|septembre|sept?\\.?|octobre|oct\\.?|novembre|nov\\.?|d[ée]cembre|d[ée]c\\.?';
const DATE_FORMATS: readonly RegExp[] = [
  /\b(?:0?[1-9]|1[0-2])\/(?:19|20)\d{2}\b/u,
  new RegExp(`(?<!\\p{L})(?:${MONTHS})\\s+(?:19|20)\\d{2}\\b`, 'iu'),
];
const BARE_YEAR = /(?<![/\d])(?:19|20)\d{2}\b/u;

export function wordCount(markdown: string): number {
  return markdown.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

function withinWords(range: { min: number; max: number }) {
  return (markdown: string): boolean => {
    const words = wordCount(markdown);
    return words >= range.min && words <= range.max;
  };
}

/** Un seul format de date (mois en chiffres, mois en lettres, ou années seules). */
function consistentDates(markdown: string): boolean {
  const formats = DATE_FORMATS.filter((format) => format.test(markdown)).length;
  const withoutMonths = DATE_FORMATS.reduce(
    (text, format) => text.replace(new RegExp(format.source, `${format.flags}g`), ''),
    markdown,
  );
  return formats + (BARE_YEAR.test(withoutMonths) ? 1 : 0) <= 1;
}

const CONTACT: CheckRule = {
  id: 'contact',
  category: 'structure',
  title: 'Coordonnées',
  tip: 'Indiquez au moins une adresse e-mail ou un numéro de téléphone, en texte simple.',
  passes: (markdown) => EMAIL.test(markdown) || PHONE.test(markdown),
};

const IMAGES: CheckRule = {
  id: 'images',
  category: 'ats',
  title: 'Sans image',
  tip: 'Les logiciels de tri (ATS) ne lisent pas le texte des images : écrivez-le en clair.',
  passes: (markdown) => !/!\[[^\]]*\]\(/.test(markdown),
};

const CV_RULES: readonly CheckRule[] = [
  CONTACT,
  {
    id: 'experience',
    category: 'structure',
    title: 'Section « Expérience »',
    tip: 'Ajoutez une section « Expérience professionnelle » : c’est le titre que les ATS cherchent.',
    passes: (markdown) => heading('exp[ée]riences?').test(markdown),
  },
  {
    id: 'education',
    category: 'structure',
    title: 'Section « Formation »',
    tip: 'Ajoutez une section « Formation » avec vos diplômes et leur année.',
    passes: (markdown) => heading('formations?|dipl[ôo]mes?|[ée]tudes').test(markdown),
  },
  {
    id: 'skills',
    category: 'structure',
    title: 'Section « Compétences »',
    tip: 'Ajoutez une section « Compétences » qui reprend les mots de l’offre que vous maîtrisez.',
    passes: (markdown) => heading('comp[ée]tences|savoir-faire|skills').test(markdown),
  },
  {
    id: 'length',
    category: 'structure',
    title: 'Une à deux pages',
    tip: `Visez ${CV_WORDS.min} à ${CV_WORDS.max} mots : assez pour montrer vos résultats, pas plus de deux pages.`,
    passes: withinWords(CV_WORDS),
  },
  {
    id: 'tables',
    category: 'ats',
    title: 'Sans tableau',
    tip: 'Les ATS lisent mal les tableaux : préférez des listes à puces.',
    passes: (markdown) => !/^\s*\|.*\|\s*$/m.test(markdown),
  },
  IMAGES,
  {
    id: 'dates',
    category: 'ats',
    title: 'Dates homogènes',
    tip: 'Écrivez toutes les dates de la même façon (par exemple « 2022 – 2026 » ou « 03/2022 – 06/2026 »).',
    passes: consistentDates,
  },
];

const LETTER_RULES: readonly CheckRule[] = [
  CONTACT,
  {
    id: 'subject',
    category: 'structure',
    title: 'Objet',
    tip: 'Ajoutez une ligne « Objet : candidature au poste de … » avec l’intitulé exact de l’offre.',
    passes: (markdown) => /^\s*objet\s*:/imu.test(markdown),
  },
  {
    id: 'greeting',
    category: 'structure',
    title: 'Formule d’appel',
    tip: 'Ouvrez par « Madame, Monsieur, » ou par le nom du recruteur s’il est connu.',
    passes: (markdown) => /^\s*(?:madame|monsieur|bonjour|cher|ch[èe]re)\b/imu.test(markdown),
  },
  {
    id: 'closing',
    category: 'structure',
    title: 'Formule de politesse',
    tip: 'Terminez par une formule de politesse, puis votre nom.',
    passes: (markdown) =>
      /salutations|cordialement|respectueusement|veuillez agr[ée]er|prie d.agr[ée]er/iu.test(
        markdown,
      ),
  },
  {
    id: 'length',
    category: 'structure',
    title: 'Longueur',
    tip: `Visez ${LETTER_WORDS.min} à ${LETTER_WORDS.max} mots : une page, lue en une minute.`,
    passes: withinWords(LETTER_WORDS),
  },
  IMAGES,
];

/** Contrôles de structure et de lisibilité par les ATS, propres au type de document. */
export function documentChecks(kind: DocumentKind, markdown: string): DocumentCheck[] {
  return (kind === 'CV' ? CV_RULES : LETTER_RULES).map(({ passes, ...check }) => ({
    ...check,
    ok: passes(markdown),
  }));
}
