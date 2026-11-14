<div align="center">

# 📊 Candidash

### Tableau de bord personnel pour **piloter sa recherche d'emploi**

**Angular 22 · Hono · PostgreSQL · Docker · auto-hébergé**

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev)
[![Hono](https://img.shields.io/badge/Hono-4-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)

[**🔗 Démo live**](https://candidash.nedellec-julien.fr) · [**📸 Captures**](#-captures-décran) · [**🏗️ Architecture**](#️-architecture) · [**🧩 Extension navigateur**](https://github.com/j-ned/chrome-candidash-extension)

<img src="apps/web/public/screen/home.webp" alt="Candidash — page d'accueil" width="100%" />

</div>

---

## 📖 Sommaire

- [🎯 Le problème](#-le-problème)
- [💡 La réponse](#-la-réponse)
- [✨ Fonctionnalités](#-fonctionnalités)
- [🏗️ Architecture](#️-architecture)
- [🧭 D'un serveur au serverless, et retour](#-dun-serveur-au-serverless-et-retour)
- [🔐 Authentification](#-authentification)
- [⏰ Relances quotidiennes](#-relances-quotidiennes)
- [🛡️ Sécurité](#️-sécurité)
- [🧰 Stack technique](#-stack-technique)
- [📸 Captures d'écran](#-captures-décran)
- [🚀 Installation](#-installation)
- [🚢 Déploiement](#-déploiement)

---

## 🎯 Le problème

Une recherche d'emploi active, c'est **des dizaines de candidatures** à suivre en parallèle :

- Quel statut pour chaque annonce ? (envoyée, entretien, refus, acceptation)
- À quel moment relancer sans devenir insistant ?
- Où est passé le CV envoyé pour *ce* poste ? La lettre personnalisée ?
- Quel est mon taux de réponse réel ?

Les tableurs **ne tiennent pas la distance**, les CRM SaaS sont **surdimensionnés** et confient tes données à un tiers, les extensions LinkedIn ne gèrent que LinkedIn.

## 💡 La réponse

**Candidash** = un tracker dédié, centré sur ce dont un candidat a vraiment besoin :

1. **Centraliser** les candidatures dans un tableau de bord (vue liste ou tableau par statut)
2. **Être relancé** par email au bon moment, sans y penser
3. **Ranger CV et lettres** avec chaque offre, ou les rédiger en Markdown et les exporter en PDF
4. **Ajouter une offre en un clic** depuis le navigateur grâce à l'extension Chrome / Firefox
5. **Protéger le compte** avec la double authentification TOTP

**Auto-hébergé, zéro traceur tiers.**

---

## ✨ Fonctionnalités

### 🎯 Suivi des candidatures

| Fonctionnalité | Détails |
|----------------|---------|
| **Tableau de bord** | KPIs (total, réponses, entretiens, répartition par statut), vue liste ou tableau, choix mémorisé |
| **Statuts** | `APPLIED` · `INTERVIEW` · `REJECTED` · `ACCEPTED` |
| **Types de contrat** | CDI · CDD · Intérim · Stage · Alternance · Freelance |
| **Notes** | Journal libre par candidature (entretiens, échanges, tests techniques) |
| **Offre d'origine** | URL normalisée (paramètres de suivi retirés) et texte de l'annonce conservé |
| **CV & LM joints** | Dépôt de fichiers par candidature, stockés sur Cloudflare R2 |

### 📝 Documents

| Fonctionnalité | Détails |
|----------------|---------|
| **Éditeur Markdown** | CV et lettres rédigés dans l'application, rattachables à une candidature |
| **Duplication** | Une lettre de base déclinée pour chaque offre |
| **Export PDF** | Par l'impression du navigateur : aucun service de rendu côté serveur |

### ⏰ Relances automatiques

| Fonctionnalité | Détails |
|----------------|---------|
| **Fréquence par candidature** | J+3, J+7, J+14… |
| **Arrêt automatique** | Plus de relance une fois la candidature acceptée ou refusée |
| **Email HTML** | Rappel avec le poste, l'entreprise et le lien de l'offre |

### 🧩 Extension navigateur

| Fonctionnalité | Détails |
|----------------|---------|
| **Ajout rapide** | `POST /jobtrack/quick-add` depuis la page de l'offre |
| **Déjà candidaté ?** | `GET /jobtrack/lookup` signale une offre déjà suivie |
| **Jetons d'API** | Créés et révoqués depuis le profil, connexion 2FA comprise |

### 🔐 Compte & administration

| Fonctionnalité | Détails |
|----------------|---------|
| **Inscription vérifiée** | Code envoyé par email avant création du compte |
| **2FA TOTP** | Google Authenticator, Authy… + codes de récupération à usage unique |
| **Mot de passe oublié** | Demande → email → nouveau mot de passe |
| **Suppression du compte** | Cascade sur candidatures, relances, documents et fichiers R2 |
| **Espace admin** | Liste des comptes et mesure d'audience maison (90 jours, sans cookie tiers) |

---

## 🏗️ Architecture

Un **monorepo pnpm** et une pile Docker Compose ([`deploy/compose.yaml`](deploy/compose.yaml)) sur un
serveur personnel, déployée par Dokploy. Un seul domaine public : le front nginx sert les pages et
relaie `/api/` vers l'API, qui n'est pas exposée. Le trafic arrive par un tunnel Cloudflare, sans
port ouvert sur Internet.

```mermaid
graph LR
  U[Navigateur] -->|HTML / JS · /api/v1| WEB[apps/web<br/>Angular statique<br/>nginx]
  EXT[Extension<br/>Chrome / Firefox] -->|Bearer jeton d'API| WEB
  WEB -->|relais /api/| API[apps/api<br/>Hono · serveur Node]
  API -->|Drizzle · pool pg| DB[(PostgreSQL 18<br/>conteneur)]
  API -->|S3 signé · aws4fetch| R2[(Cloudflare R2<br/>CV & LM)]
  API -->|API Resend| MAIL[Emails]
  CRON[candidash-cron<br/>7 h UTC] -->|GET /cron/daily| API
  BACKUP[candidash-backup<br/>3 h UTC] -->|dump chiffré| R2B[(R2<br/>sauvegardes)]
  DB --> BACKUP
```

| Dossier | Contenu | Production |
|---------|---------|------------|
| [`apps/web`](apps/web) | Front Angular 22 zoneless, Tailwind 4 ; pages publiques prérendues, espace connecté en rendu client | Conteneur nginx sur le serveur (Dokploy) — `candidash.nedellec-julien.fr` |
| [`apps/api`](apps/api) | API Hono, Drizzle + PostgreSQL, fichiers R2 via l'API S3, tâches quotidiennes | Conteneur Node sur le serveur (Dokploy), sans domaine à lui : le front le relaie sous `candidash.nedellec-julien.fr/api/` ([deploy/README.md](deploy/README.md)) |

### Front — clean architecture par feature

Chaque feature (`auth`, `jobtrack`, `documents`, `profile`, `admin`…) suit **`domain → infra → application`** : le domain ne connaît pas Angular, l'état vit dans des signals, sans NgRx.

```
apps/web/src/app/features/<feature>/
├── domain/        # types, gateways abstraites, use cases — TypeScript pur
├── infra/         # gateways HttpClient, adapters DTO → modèle
└── application/   # état en signals + composants
```

### API — une seule app Hono, partout

```
apps/api/src/
├── create-app.ts   # app Hono : en-têtes de sécurité, CORS, limites de débit, routes /api/v1
├── main.ts         # point d'entrée de l'image Docker : migrations, puis serveur Node
├── routes/         # auth, 2fa, accounts, jobtrack, job-files, documents, api-tokens, admin, cron…
├── auth/           # jetons, sessions, argon2id, TOTP, chiffrement AES-GCM
├── db/             # schéma Drizzle, pool partagé par instance
├── files/          # bucket R2 (S3 signé, sans SDK AWS)
├── jobs/           # relances et purges du cron quotidien
└── mail/           # transports Resend et SMTP, gabarits HTML
```

La même `createApp()` tourne dans l'image Docker, en local (`@hono/node-server`) et dans les tests (`app.request()`), sans adaptation.

---

## 🧭 D'un serveur au serverless, et retour

Candidash a connu trois hébergements, sans que le contrat ne bouge :

1. **Un VPS** : API **NestJS** ([nest-candidash-app](https://github.com/j-ned/nest-candidash-app)), front Angular servi par **nginx** ([ng-candidash-app](https://github.com/j-ned/ng-candidash-app)), Postgres et Gotenberg en conteneurs.
2. **Vercel + Neon** : l'API réécrite en **Hono**, en fonction Node, avec un Postgres serverless ([docs/bascule.md](docs/bascule.md)).
3. **Le serveur personnel**, depuis le 14 novembre 2026 : la même API Hono dans une image Docker, Postgres en conteneur, le tout déployé par Dokploy ([deploy/README.md](deploy/README.md)).

À chaque étape :

- **Mêmes routes `/api/v1`, même forme d'erreur** : le front et l'extension n'ont pas eu à suivre.
- **Mêmes données** : migrations Drizzle reprises telles quelles, base copiée par `pg_dump` / `pg_restore`.
- **Mêmes secrets** : hachages de mots de passe, secrets TOTP chiffrés et jetons de l'extension restent valides ; des tests rejouent des valeurs produites par l'API Nest (`apps/api/test/compat.test.ts`).

Le passage par le serverless a laissé des choix qui tiennent toujours avec un serveur au long cours :

| Contrainte d'origine | Réponse, toujours en place |
|----------------------|----------------------------|
| Pas de mémoire partagée entre instances | Limites de débit comptées **en base** (fenêtre d'une minute, purgée par les tâches quotidiennes) |
| Connexions Postgres coûteuses | Pool de 3 connexions par processus |
| Cron sans garantie d'unicité | Relances **réservées en base** avant envoi (`FOR UPDATE SKIP LOCKED`) |
| Pas de serveur pour poser un nonce CSP | CSP des scripts par **empreintes SHA-256** calculées au build |
| Pas de module natif compilé | argon2id en JavaScript pur (`@noble/hashes`) |
| Service de rendu PDF à maintenir | Plus de Gotenberg : export PDF par l'impression du navigateur |

---

## 🔐 Authentification

```mermaid
sequenceDiagram
  participant U as Navigateur
  participant API as API Hono
  participant DB as PostgreSQL

  U->>API: POST /auth/login {email, password}
  API->>DB: Vérification argon2id
  alt 2FA activée
    API-->>U: {requires2FA, tempToken} (valable 5 min)
    U->>API: POST /auth/2fa/validate {tempToken, code}
  end
  API->>DB: Hachage du refresh token enregistré
  API-->>U: accessToken (24 h) + cookie refresh HttpOnly (7 j)

  loop Requête authentifiée
    U->>API: Bearer accessToken
    alt 401
      U->>API: POST /auth/refresh (cookie)
      API-->>U: nouveaux jetons, l'ancien refresh est invalidé
    end
  end
```

- **Jetons typés** (`hono/jwt`, HS256) : un refresh ou un jeton 2FA temporaire ne peut jamais servir de jeton d'accès.
- **Refresh token** en cookie HttpOnly ; seul son hachage SHA-256 est gardé en base (rotation à chaque usage).
- **Révocation immédiate** : le jeton d'accès porte la version de session de l'utilisateur, relue en base à chaque requête ; déconnexion, changement ou réinitialisation du mot de passe l'incrémentent.
- **Migration progressive des mots de passe** : les anciens hachages bcrypt ou SHA-256 sont vérifiés puis re-hachés en argon2id à la connexion.
- **Côté Angular** : jeton d'accès en mémoire (signal), intercepteur fonctionnel qui rejoue la requête après un refresh, guards fonctionnels.

---

## ⏰ Relances quotidiennes

Le conteneur `candidash-cron` appelle chaque jour à 7 h UTC `GET /api/v1/cron/daily`, protégé par `CRON_SECRET` :

1. **Réserve** les relances échues (100 au plus) en une requête : reprogrammées à leur fréquence, lignes verrouillées en `SKIP LOCKED`
2. **Envoie** les emails ; un envoi raté remet la relance dans son état précédent pour le passage suivant
3. **Purge** les codes expirés, les inscriptions jamais confirmées, les fenêtres de limites de débit et les visites de plus de 90 jours

Un cron déclenché deux fois n'envoie donc **qu'une seule fois** chaque relance.

---

## 🛡️ Sécurité

- ✅ **argon2id** (paramètres OWASP : 19 Mio, 2 passes) pour les mots de passe
- ✅ **2FA TOTP** avec secret chiffré en **AES-256-GCM** et codes de récupération hachés à usage unique
- ✅ **Limites de débit** en base : 5 req/min sur l'authentification, 30 req/min au global, 2 req/min sur le contact
- ✅ **Validation Zod** stricte sur chaque entrée (champ inconnu refusé)
- ✅ **CORS** en liste blanche (`ALLOWED_ORIGINS`)
- ✅ **En-têtes de sécurité** : `hono/secure-headers` côté API, CSP / HSTS / `X-Frame-Options` posés par nginx côté front
- ✅ **API non exposée** : jointe seulement par le relais du front, sur le réseau interne de la pile
- ✅ **Sauvegarde quotidienne chiffrée** de la base, hors du serveur
- ✅ **Fichiers isolés par utilisateur** dans R2, supprimés avec la candidature ou le compte
- ✅ **pnpm** : délai de 14 jours avant d'adopter une nouvelle version publiée (attaques supply chain)

---

## 🧰 Stack technique

### Front (`apps/web`)

- **Angular 22** — zoneless, standalone, signals, `inject()`, control flow `@if` / `@for`
- **Angular SSR** — prérendu des pages publiques (accueil, fonctionnalités, contact, pages légales)
- **TailwindCSS v4** — thème en `@theme`, clair / sombre
- **marked + DOMPurify** — rendu Markdown des documents
- **Vitest 4** + `@analogjs/vite-plugin-angular`, ESLint `angular-eslint`

### API (`apps/api`)

- **Hono 4** + `@hono/zod-validator` + **Zod 4**
- **Drizzle ORM** + `pg`, migrations SQL versionnées (`drizzle/`)
- **@noble/hashes** (argon2id) · **otpauth** + **qrcode** (TOTP) · **aws4fetch** (R2) · **Resend** (API HTTP) ou **nodemailer** (SMTP)
- **TypeScript 7** · **Vitest 4** en intégration contre un vrai Postgres

### Infrastructure

- **Docker Compose + Dokploy** — front nginx, API Node, tâches quotidiennes, Postgres et sauvegarde sur un serveur personnel
- **PostgreSQL 18** — en conteneur, dump chiffré chaque nuit vers un bucket R2
- **Cloudflare Tunnel** — seule entrée du serveur, TLS compris
- **Cloudflare R2** — stockage des CV et lettres (API S3)
- **GitHub Actions** — typecheck, migrations et tests sur Postgres 17, lint et build du front, images construites et vérifiées à chaque PR ; publication sur GHCR et déploiement sur `master`

---

## 📸 Captures d'écran

<table>
  <tr>
    <td width="50%">
      <p align="center"><b>Accueil — thème sombre</b></p>
      <img src="apps/web/public/screen/home.webp" alt="Accueil en thème sombre" width="100%" />
    </td>
    <td width="50%">
      <p align="center"><b>Accueil — thème clair</b></p>
      <img src="apps/web/public/screen/home-light.webp" alt="Accueil en thème clair" width="100%" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <p align="center"><b>Fonctionnalités</b></p>
      <img src="apps/web/public/screen/features.webp" alt="Page des fonctionnalités" width="100%" />
    </td>
    <td width="50%">
      <p align="center"><b>Connexion</b></p>
      <img src="apps/web/public/screen/signin.webp" alt="Écran de connexion" width="100%" />
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <p align="center"><b>Inscription</b></p>
      <img src="apps/web/public/screen/signup.webp" alt="Écran d'inscription" width="100%" />
    </td>
  </tr>
</table>

---

## 🚀 Installation

> Pré-requis : Node.js 26, pnpm (version fixée par `packageManager`), Docker pour le Postgres local

```bash
# 1. Cloner et installer (un seul lockfile pour les deux applications)
git clone https://github.com/j-ned/candidash-app.git
cd candidash-app
pnpm install

# 2. Postgres local
docker run -d --name candidash-db -p 5432:5432 \
  -e POSTGRES_USER=candidash -e POSTGRES_PASSWORD=candidash -e POSTGRES_DB=candidash postgres:17

# 3. Configurer l'API puis migrer
cp apps/api/.env.example apps/api/.env
DATABASE_URL=postgresql://candidash:candidash@localhost:5432/candidash pnpm --filter api db:migrate

# 4. Lancer
PORT=3000 pnpm dev:api   # API sur http://localhost:3000/api/v1 (8787 par défaut)
pnpm dev:web             # front sur http://localhost:4200
```

Le front local appelle `http://localhost:3000/api/v1` (`apps/web/public/config.json`) : d'où le
`PORT=3000`, ou bien modifier `apiUrl` dans ce fichier.

Sans Resend ni SMTP configuré, les emails (codes de vérification, liens) s'affichent dans la console de l'API.

### Scripts

| Commande | Action |
|----------|--------|
| `pnpm dev:api` | API en watch (`tsx`, même app qu'en production) |
| `pnpm dev:web` | Front Angular en dev |
| `pnpm test` | Tests des deux applications |
| `pnpm build` | Build de production du front |
| `pnpm --filter api typecheck` | Vérification TypeScript de l'API |
| `pnpm --filter api db:generate` | Nouvelle migration Drizzle depuis le schéma |
| `pnpm --filter web lint` | ESLint du front |

Conventions propres à chaque application : [apps/web/CLAUDE.md](apps/web/CLAUDE.md) et [apps/api/README.md](apps/api/README.md).

---

## 🚢 Déploiement

La CI GitHub ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) vérifie les deux applications
sur chaque PR, puis construit et vérifie les trois images (`candidash-web`, `candidash-api`,
`candidash-backup`). Sur `master`, elle les publie sur GHCR et demande à Dokploy de redéployer la
pile : une fusion est en ligne quelques minutes plus tard, sans geste manuel.

Les migrations s'appliquent **au démarrage de l'API**, avant qu'elle n'écoute. Une migration ne se
défait pas en revenant à une image précédente : chaque changement de schéma doit rester compatible
avec la version d'avant (expand, migrate, contract).

Mise en place, sauvegardes, retour à une version : [deploy/README.md](deploy/README.md).

---

## 🔗 Écosystème Candidash

- **Application (ce dépôt)** — Angular 22 + Hono, auto-hébergée (Docker Compose, Dokploy)
- **Extension navigateur** — [chrome-candidash-extension](https://github.com/j-ned/chrome-candidash-extension) · Chrome et Firefox
- **Anciennes versions** — [ng-candidash-app](https://github.com/j-ned/ng-candidash-app) (front) et [nest-candidash-app](https://github.com/j-ned/nest-candidash-app) (API NestJS), remplacées par ce dépôt

---

<div align="center">

**Développé par [Julien Nédellec](https://nedellec-julien.fr)**

[![Portfolio](https://img.shields.io/badge/Portfolio-nedellec--julien.fr-F97316?style=for-the-badge)](https://nedellec-julien.fr)
[![GitHub](https://img.shields.io/badge/GitHub-j--ned-181717?style=for-the-badge&logo=github)](https://github.com/j-ned)

</div>
