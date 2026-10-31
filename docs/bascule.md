# Bascule de Dokploy (Nest + nginx) vers Vercel (Hono + Angular statique) et Neon

Cible : deux projets Vercel (plan **Hobby, usage non commercial**) depuis ce dépôt, base **Neon**
(Postgres serverless, intégré à Vercel), fichiers toujours sur **R2** (API S3), DNS toujours chez
**Infomaniak**. Les adresses ne changent pas : `candidash.nedellec-julien.fr` (front) et
`api-candidash.nedellec-julien.fr` (API), donc rien à changer dans l'extension.

**À reprendre à l'identique de l'API Nest** (variables Dokploy du service Backend) : `JWT_SECRET`
(sinon toutes les sessions et les jetons de l'extension tombent), `TOTP_ENCRYPTION_KEY` (sinon la
2FA devient illisible), les `S3_*` (les CV/LM existants restent lisibles) et les `MAIL_*`.

## 0. Prérequis

- Compte Vercel (Hobby), relié à GitHub.
- Accès Infomaniak (zone DNS de `nedellec-julien.fr`) et Dokploy.
- Les valeurs actuelles des variables du service **Backend** sur Dokploy, et `EXTENSION_ID`,
  `FIREFOX_ADDON_URL` du service **Frontend**.
- La carte Cloudflare à jour : R2 reste facturé par Cloudflare (gratuit sous 10 Go, mais
  l'abonnement R2 se renouvelle le 30 novembre).

## 1. Base Neon (aucun impact)

1. Vercel → *Storage* → *Create Database* → **Neon** (plan Free), région **Frankfurt
   (eu-central-1)**, nom `candidash`.
2. La relier au futur projet API (étape 2) : Vercel ajoute `DATABASE_URL` à ses variables.
3. Noter la *connection string* (pooled) pour les commandes des étapes 4 et 8.

## 2. Projets Vercel (aucun impact)

Importer `j-ned/candidash-app` **deux fois** (*Add New* → *Project*) :

| Projet | Root Directory | Framework | Variables |
|---|---|---|---|
| `candidash-api` | `apps/api` | Hono (détecté) | `DATABASE_URL` (Neon), `ALLOWED_ORIGINS=https://candidash.nedellec-julien.fr`, `JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, `S3_ENDPOINT`, `S3_REGION=auto`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM_NAME=Candidash`, `MAIL_FROM_ADDRESS`, `CONTACT_RECIPIENT`, `CRON_SECRET` (32 caractères aléatoires : `openssl rand -hex 32`) |
| `candidash-web` | `apps/web` | Other (vercel.json) | `API_URL=https://api-candidash.nedellec-julien.fr/api/v1`, `EXTENSION_ID`, `FIREFOX_ADDON_URL` |

Dans les deux projets :

- *Settings* → *Build & Deployment* : variable `ENABLE_EXPERIMENTAL_COREPACK=1`, pour que Vercel
  utilise le pnpm 12 du `packageManager` (le délai de 14 jours et les builds autorisés de
  `pnpm-workspace.yaml` en dépendent).
- *Settings* → *Functions* (API) : région **Frankfurt (fra1)**, la même que Neon (sinon chaque
  requête traverse l'Atlantique).

Le cron quotidien (`apps/api/vercel.json`, 7 h UTC) part dès le premier déploiement : **dans le
projet API, *Settings* → *Cron Jobs* → *Disable* jusqu'à l'étape 6**, sinon il enverrait des
relances en double avec l'API Nest.

## 3. Copie de répétition des données (aucun impact)

Depuis le VPS (remplacer `<pg>` par le conteneur Postgres de Dokploy, `candidash-database-…`) :

```bash
docker exec <pg> pg_dump -U djoudj -d candidash_db -Fc --no-owner --no-acl > candidash.dump
pg_restore --no-owner --no-acl -d "<connection string Neon>" candidash.dump
DATABASE_URL="<connection string Neon>" pnpm --filter api db:migrate   # ajoute LimitesDebit
```

La table de suivi des migrations Drizzle est copiée avec les données : seule la nouvelle
migration (`0006_rate_limits`) s'applique.

## 4. Répétition sur les adresses *.vercel.app (aucun impact)

```bash
curl https://candidash-api-<…>.vercel.app/api/v1/health          # {"status":"ok",…}
curl -i -X POST https://candidash-api-<…>.vercel.app/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"<ton email>","password":"<ton mot de passe>"}'
```

La connexion valide Neon, argon2 et `JWT_SECRET`. `POST /api/v1/accounts/forgot-password` sur ta
propre adresse valide le SMTP. Le front en *.vercel.app ne peut pas se connecter à l'API en
*.vercel.app (cookies SameSite entre deux domaines différents) : normal, il sera testé à l'étape 6.

## 5. Domaines dans Vercel (aucun impact)

- `candidash-web` → *Settings* → *Domains* → `candidash.nedellec-julien.fr`
- `candidash-api` → *Settings* → *Domains* → `api-candidash.nedellec-julien.fr`

Vercel affiche l'enregistrement attendu. **Utiliser un enregistrement A** (valeur donnée par
Vercel) et non un CNAME : `candidash.nedellec-julien.fr` porte aussi un TXT de vérification
Google, qu'un CNAME interdirait.

## 6. Bascule (coupure de quelques minutes)

1. Dokploy → Candidash → **arrêter Backend** (pas supprimer) : plus aucune écriture dans l'ancienne
   base, plus de relances côté Nest.
2. Copie finale des données vers Neon : vider la base Neon (*Branches* → *Reset from parent* ou
   recréer la base) puis relancer les commandes de l'étape 3.
3. Infomaniak → zone DNS de `nedellec-julien.fr` : remplacer les A de `candidash` et
   `api-candidash` (82.64.148.159) par ceux donnés par Vercel. TTL court (5 min) si possible.
4. Vercel → projet API → *Cron Jobs* → **Enable**.
5. Vérifier : `https://api-candidash.nedellec-julien.fr/api/v1/health`, connexion depuis le front,
   2FA, dépôt et téléchargement d'un CV, export PDF, ajout depuis l'extension, console du
   navigateur sans erreur CSP.

## 7. Retour arrière

Remettre les A `candidash` et `api-candidash` sur 82.64.148.159, redémarrer Backend sur Dokploy,
désactiver les cron Vercel. **Les écritures faites dans Neon depuis la bascule ne sont pas dans
l'ancienne base** : si besoin, recopier dans l'autre sens (`pg_dump` Neon → `pg_restore` Dokploy).

## 8. Après une à deux semaines stables

- Supprimer sur Dokploy les services Backend, Frontend, gotenberg, puis database (garder un
  dernier `pg_dump` en sauvegarde).
- Supprimer sur Cloudflare la zone `nedellec-julien.fr` en attente (jamais activée) ; garder R2.
- Archiver les dépôts `nest-candidash-app` et `ng-candidash-app`.

## Migrations de schéma, ensuite

```bash
DATABASE_URL="<connection string Neon>" pnpm --filter api db:migrate
```

Lancer la migration **avant** de fusionner le code qui en dépend.
