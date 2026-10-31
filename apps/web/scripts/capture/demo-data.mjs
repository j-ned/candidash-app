// Données fictives des captures : personnes et entreprises inventées, dates relatives au jour de
// l'enregistrement pour que le tableau et les statistiques paraissent à jour.

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();

export const DEMO_USER = { username: 'Camille Martin' };

export const OFFER_TEXT = `Nordlys Studio recherche une développeuse ou un développeur Angular confirmé pour faire évoluer sa plateforme de réservation.

Vos missions :
- faire évoluer l'application Angular 22 (signals, RxJS) et ses tests Vitest et Playwright ;
- concevoir des API NestJS sur PostgreSQL ;
- participer aux rituels Agile Scrum de l'équipe produit.

Profil recherché : maîtrise d'Angular et de TypeScript, connaissance de Docker et de GitLab CI/CD, sensibilité à l'accessibilité (RGAA). Télétravail deux jours par semaine, poste basé à Nantes.`;

export const JOBS = [
  {
    title: 'Développeuse Angular confirmée',
    company: 'Nordlys Studio',
    status: 'TO_APPLY',
    contractType: 'CDI',
    offerText: OFFER_TEXT,
    key: 'target',
  },
  {
    title: 'Ingénieure front-end',
    company: 'Atelier Brume',
    status: 'TO_APPLY',
    contractType: 'CDI',
  },
  {
    title: 'Développeuse full stack TypeScript',
    company: 'Cobalt Santé',
    status: 'TO_APPLY',
    contractType: 'CDD',
  },
  {
    title: 'Développeuse Angular',
    company: 'Maison Pixel',
    status: 'APPLIED',
    appliedAt: daysAgo(2),
    contractType: 'CDI',
  },
  {
    title: 'Lead front-end',
    company: 'Octave Énergie',
    status: 'APPLIED',
    appliedAt: daysAgo(6),
    contractType: 'CDI',
  },
  {
    title: 'Développeuse web accessibilité',
    company: 'Lumen Assurances',
    status: 'APPLIED',
    appliedAt: daysAgo(11),
    contractType: 'CDI',
  },
  {
    title: 'Développeuse NestJS',
    company: 'Kerguelen Data',
    status: 'APPLIED',
    appliedAt: daysAgo(17),
    contractType: 'FREELANCE',
  },
  {
    title: 'Développeuse front-end',
    company: 'Ondine Mobilité',
    status: 'INTERVIEW',
    appliedAt: daysAgo(15),
    contractType: 'CDI',
  },
  {
    title: 'Ingénieure logiciel',
    company: 'Ferment Labs',
    status: 'INTERVIEW',
    appliedAt: daysAgo(24),
    contractType: 'CDI',
  },
  {
    title: 'Développeuse Angular senior',
    company: 'Vélo Gourmet',
    status: 'ACCEPTED',
    appliedAt: daysAgo(33),
    contractType: 'CDI',
  },
  {
    title: 'Développeuse React',
    company: 'Pic Vert',
    status: 'REJECTED',
    appliedAt: daysAgo(28),
    contractType: 'CDD',
  },
  {
    title: 'Intégratrice web',
    company: 'Granit & Co',
    status: 'REJECTED',
    appliedAt: daysAgo(40),
    contractType: 'STAGE',
  },
];

export const CV_MARKDOWN = `# Camille Martin
Développeuse Angular — Nantes
camille.martin@exemple.fr · 06 12 34 56 78

Développeuse front-end depuis sept ans, je conçois des interfaces Angular rapides, accessibles et testées, en lien étroit avec les équipes produit et design.

## Expérience

### Développeuse Angular — Maison Pixel (2022 – 2026)
- Migration d'une application de 120 écrans vers Angular 22 et les signals, sans interruption de service
- Tests Vitest : couverture passée de 35 % à 82 %, temps de la chaîne d'intégration divisé par deux
- Accessibilité RGAA : audit complet et corrections, zéro violation axe en intégration continue
- Encadrement de deux développeurs juniors et revue de code quotidienne

### Développeuse front-end — Atelier Brume (2019 – 2022)
- Intégration de maquettes Figma en Tailwind CSS pour une dizaine de clients
- API NestJS et PostgreSQL pour un back-office de réservation utilisé par 40 agences
- Mise en place d'une bibliothèque de composants partagée entre trois applications

## Formation
- Master informatique — Université de Nantes (2019)
- Licence informatique — Université de Rennes (2017)

## Compétences
**Front** : Angular, TypeScript, RxJS, Tailwind CSS
**Back** : NestJS, PostgreSQL, Docker
**Méthodes** : tests automatisés, accessibilité, revue de code`;
