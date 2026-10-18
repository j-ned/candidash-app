import type { DocumentKind } from './models/document.model';

export type StarterDocument = { readonly title: string; readonly markdown: string };

// Squelette de CV : sections standard, reconnues par les ATS, sans tableau ni image.
export const CV_TEMPLATE = `# Prénom Nom

**Intitulé du poste recherché**

## Coordonnées

- Ville (département)
- 06 00 00 00 00
- prenom.nom@exemple.fr
- linkedin.com/in/prenom-nom

## Profil

Deux ou trois phrases : ce que vous savez faire, pour qui, et ce que vous cherchez.

## Expérience

### Intitulé du poste — Entreprise

*Mois Année – Mois Année · Ville*

- Réalisation concrète, avec un résultat chiffré si possible
- Outil ou technologie utilisé, et dans quel but

## Formation

### Diplôme — Établissement

*Année · Ville*

## Compétences

- **Domaine** : compétence, compétence, compétence
- **Outils** : outil, outil

## Langues

- Français : langue maternelle
- Anglais : niveau (B2, C1…)
`;

// Squelette de lettre : coordonnées, destinataire, objet, accroche, corps, conclusion, politesse.
export const LETTER_TEMPLATE = `Prénom Nom
Adresse
06 00 00 00 00 · prenom.nom@exemple.fr

Entreprise
À l’attention de Madame ou Monsieur Nom
Adresse

Ville, le date

**Objet : candidature au poste de intitulé du poste**

Madame, Monsieur,

Accroche : ce qui vous attire dans l’entreprise ou dans ce poste, en une ou deux phrases.

Corps : votre expérience utile pour ce poste, avec un ou deux exemples concrets. Montrez ce que
vous apporterez à l’équipe plutôt que ce que le poste vous apportera.

Conclusion : votre disponibilité et votre souhait d’échanger lors d’un entretien.

Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.

Prénom Nom
`;

const STARTERS: Readonly<Record<DocumentKind, StarterDocument>> = {
  CV: { title: 'Mon CV', markdown: CV_TEMPLATE },
  LETTER: { title: 'Ma lettre de motivation', markdown: LETTER_TEMPLATE },
};

export function starterDocument(kind: DocumentKind): StarterDocument {
  return STARTERS[kind];
}
