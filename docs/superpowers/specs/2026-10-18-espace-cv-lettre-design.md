# Espace CV et lettre de motivation — design

Date : 2026-10-18. Concerne `ng-candidash-app`, `nest-candidash-app`, `chrome-candidash-extension` et l'infra (Gotenberg).

## Description

L'utilisateur rédige et retravaille son CV et ses lettres de motivation dans Candidash, avec une
édition proche de celle des articles du portfolio. Il peut :

- partir d'un PDF existant (texte extrait) ou d'un modèle ;
- éditer en Markdown avec barre d'outils et aperçu en direct, mis en page comme le PDF final ;
- exporter un PDF propre, à texte sélectionnable (lisible par les ATS) ;
- confronter le document à une offre : mots-clés présents ou manquants, structure attendue, conseils ;
- décliner un document de base pour une candidature précise, et le joindre à cette candidature.

## Décisions (validées par l'utilisateur le 2026-10-18)

| Sujet | Choix | Raison |
|---|---|---|
| Édition | Markdown + barre d'outils + aperçu | Contenu structuré et sobre (favorable aux ATS), code de l'éditeur d'articles du portfolio réutilisable |
| Import PDF | Extraction du texte dans le navigateur (pdf.js) | Le contenu est récupéré ; la mise en page d'origine est perdue, l'utilisateur retouche |
| Export PDF | Génération serveur par Gotenberg (Chromium) | Fichier identique pour tous, texte sélectionnable ; un conteneur de plus sur le homeserver |
| Analyse ATS / offre | Déterministe, sans IA | Gratuit, instantané, aucune donnée hors de Candidash ; l'IA pourra s'ajouter plus tard |

## Modèle

Table `Documents` (API) :

- `id`, `userId` (FK cascade), `kind` (`CV` | `LETTER`), `title`, `markdown` (texte, borné à 50 000 caractères),
  `template` (identifiant du gabarit de mise en page, `sobre` au départ), `baseDocumentId` (nullable, le
  document de base dont celui-ci est une déclinaison), `jobTrackId` (nullable, candidature visée),
  `createdAt`, `updatedAt`.
- Une déclinaison est une copie indépendante : modifier la base ne touche pas les déclinaisons.

Table `Annonces` : nouvelle colonne `offerText` (texte de l'offre, nullable, borné à 20 000 caractères),
remplie par l'extension (description JSON-LD) ou collée par l'utilisateur. C'est la matière de l'analyse.

## Tranches (une PR chacune, dans cet ordre)

1. **Documents : CRUD + éditeur.** API `GET/POST/PUT/DELETE /documents` (JWT, limité à ses documents).
   Front `/dashboard/documents` : liste (CV / lettres), éditeur Markdown repris du portfolio (barre
   d'outils, raccourcis, aperçu `marked` + DOMPurify), gabarit d'aperçu A4 « sobre », sauvegarde
   explicite avec indicateur de modifications non enregistrées et garde de sortie (`CanDeactivateFn`).
2. **Export PDF.** Service Gotenberg (`gotenberg/gotenberg`, réseau Docker interne, jamais exposé).
   API `GET /documents/:id/pdf` : Markdown → HTML assaini → gabarit HTML/CSS → Gotenberg → PDF.
   Téléchargement depuis l'éditeur. Option « joindre à la candidature » qui alimente le CV/LM existant
   (`cvFileName`/`lmFileName`, même stockage S3).
3. **Import PDF.** `pdfjs-dist` côté front (worker servi par le site, compatible CSP), texte converti en
   Markdown simple (paragraphes, puces, titres devinés par la taille de police), aperçu avant remplacement.
4. **Analyse et tips.** Panneau à côté de l'éditeur, fonctions pures testées :
   - structure : sections attendues (CV : contact, expérience, formation, compétences ; lettre :
     destinataire, accroche, motivation, conclusion), longueur (CV 1–2 pages estimées, lettre ~250–400 mots) ;
   - ATS : pas de tableaux ni d'images, dates homogènes, coordonnées présentes, titres standard ;
   - offre : mots-clés et compétences extraits de `offerText` (fréquence, liste de compétences connues,
     mots vides retirés), présents ou manquants dans le document, score de couverture expliqué ;
   - conseils contextuels courts, liés à chaque alerte (« Ajoute "Angular 22" si tu le maîtrises »).
5. **Offre captée par l'extension.** L'extension envoie la description de l'annonce (JSON-LD
   `description`, texte nettoyé) dans `offerText` à l'ajout rapide ; l'utilisateur peut aussi la coller
   dans la fiche de la candidature. Mise à jour de la confidentialité (description de l'offre envoyée au clic).

## Sécurité et confidentialité

- Markdown rendu côté front avec DOMPurify, côté serveur avec une liste blanche de balises avant Gotenberg.
- Gotenberg n'est joignable que par l'API (réseau interne), avec délai et taille maximale de requête.
- Le gabarit PDF n'inclut aucune ressource externe (polices auto-hébergées).
- CSP du front inchangée : aperçu sans style inline (classes), worker pdf.js servi depuis `'self'`.
- Les documents sont des données personnelles : suppression en cascade avec le compte, mention dans les CGU.

## Hors périmètre (pour plus tard)

Suggestions par IA, gabarits multiples, partage public d'un CV, historique des versions.
