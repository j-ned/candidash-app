# Previews Vercel isolées de la production

Une preview (`VERCEL_ENV=preview`, toute branche autre que `master`) ne doit jamais toucher aux
données ni aux secrets de production. Elle tourne sur la branche Neon `preview` (schéma + seed de
démo, **jamais de copie de prod**) avec ses propres secrets.

## Ce que fait le code (sans configuration)

| Sujet | Production | Preview |
|---|---|---|
| Emails | SMTP ; `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD` **obligatoires** (sinon chaque requête échoue avec « Variable d'environnement manquante ») | **Aucun envoi**, même si des `MAIL_*` traînent en Preview. Log : destinataire masqué (`j***@example.com`) + sujet, jamais de code ni de lien |
| Fichiers (CV/LM) | `S3_*` obligatoires | Sans `S3_BUCKET` : dépôt et téléchargement → **503** « Stockage de fichiers désactivé sur cet environnement » ; suppression d'une candidature toujours possible |
| Cron quotidien | Vercel Cron + `CRON_SECRET` | Vercel ne lance les crons que sur la production ; sans `CRON_SECRET`, `/cron/daily` répond 401 |
| Formulaire de contact | `CONTACT_RECIPIENT` | Absent : 503 (comportement existant) |

Le choix repose sur `VERCEL_ENV`, posé par Vercel lui-même, et non sur une variable du projet
(`MAIL_TRANSPORT=log`, par exemple) : une variable oubliée ou mal ciblée ferait partir de vrais
emails depuis une preview, alors que `VERCEL_ENV` ne peut pas valoir `production` sur une preview.

## Variables à créer en **Preview uniquement** (Vercel → Settings → Environment Variables)

| Nom | Valeur | Statut |
|---|---|---|
| `DATABASE_URL` | Chaîne de connexion **poolée** de la branche Neon `preview` | Obligatoire |
| `JWT_SECRET` | Nouveau secret : `openssl rand -base64 48` (jamais celui de prod : un jeton de prod ne doit pas être valide en preview, et inversement) | Obligatoire |
| `TOTP_ENCRYPTION_KEY` | Nouvelle clé AES-256 en hex : `openssl rand -hex 32` | Obligatoire |
| `ALLOWED_ORIGINS` | `https://candidash-app.vercel.app` (doit être non vide ; le front de preview appelle l'API sur sa propre origine via `/api/v1`, le CORS n'intervient pas) | Obligatoire |
| `API_URL` | `/api/v1` (service `web` : `config.json` pointe sur l'API de la **même** preview ; sans elle, le front de preview appelle `localhost`) | Obligatoire |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION` | Seulement pour tester les fichiers : bucket R2 dédié `candidash-preview` et jeton R2 limité à ce bucket | Facultatif (absent = fichiers en 503) |
| `CONTACT_RECIPIENT` | Adresse de test ; l'email n'est de toute façon pas envoyé en preview | Facultatif |
| `CRON_SECRET` | `openssl rand -hex 32` si l'on veut appeler `/cron/daily` à la main (les relances ne partent pas : emails journalisés) | Facultatif |

À ne **pas** créer en Preview : `MAIL_*` (ignorées), `EXTENSION_ID`, `FIREFOX_ADDON_URL`.

`ENABLE_EXPERIMENTAL_COREPACK=1` garde ses deux cibles (production et preview) : ce n'est pas un
secret, le build en dépend.

## Variables dont il faut **retirer la cible Preview** (garder Production)

`DATABASE_URL` et toute la famille `DATABASE_*` de Neon, `JWT_SECRET`, `CRON_SECRET`,
`TOTP_ENCRYPTION_KEY`, `S3_ACCESS_KEY`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_SECRET_KEY`,
`MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_HOST`, `MAIL_PASSWORD`, `MAIL_PORT`, `MAIL_USER`,
`ALLOWED_ORIGINS`, `CONTACT_RECIPIENT`.

Si les `DATABASE_*` sont gérées par l'intégration Neon de Vercel, le ciblage se règle dans
l'intégration (environnements reliés), pas variable par variable.

## Secret GitHub Actions

| Nom | Valeur | Effet |
|---|---|---|
| `PREVIEW_DATABASE_URL_UNPOOLED` | Chaîne **directe** (non poolée) de la branche Neon `preview` | Le job `preview-db` de la CI applique les migrations de chaque PR sur cette branche, après leur passage sur le Postgres jetable du job `api`. Sans le secret (forks, Dependabot), le job ne fait rien |

Une migration d'une PR non fusionnée reste appliquée sur la base de preview : en cas de conflit,
réinitialiser la base (étapes ci-dessous).

## Initialiser la base de preview (vide, sans donnée réelle)

1. Neon → *Branches* → *Create branch* `preview` **sans données** (option « schema only » ;
   si elle n'est pas proposée, un projet Neon séparé). Ne jamais partir d'une branche avec
   données : ce serait une copie de prod.
2. Une branche « schema only » a les tables mais pas l'historique Drizzle : vider le schéma
   avant d'initialiser, sinon la première migration échoue sur des tables existantes.

   ```sql
   DROP SCHEMA IF EXISTS drizzle CASCADE;
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

3. Les rôles d'une branche Neon sont hérités de la branche parente : **régénérer le mot de passe
   du rôle** sur la branche `preview` (Neon → *Roles* → *Reset password*), pour que la chaîne de
   preview ne contienne pas le mot de passe de prod.
4. Migrations + seed de démo :

   ```bash
   DATABASE_URL="<URL directe de la branche preview>" \
   DEMO_PASSWORD="$(openssl rand -base64 18)" \
   pnpm --filter api db:init-demo
   ```

   Le seed crée le compte `demo@demo.candidash.test` (mot de passe = `DEMO_PASSWORD`, à garder
   dans un gestionnaire de mots de passe) et quelques candidatures fictives. Il **refuse** toute
   base qui contient un autre compte (production ou copie), et refuse de tourner si
   `VERCEL_ENV=production`. Relançable : il recrée les données de démo à l'identique.

## Ce qui reste désactivé en preview

- Envoi d'emails (inscription : le code de validation n'est **pas** journalisé ; utiliser le
  compte de démo).
- Fichiers CV/LM sans bucket dédié (503).
- Cron des relances (pas de cron Vercel hors production).
- Extension navigateur (`EXTENSION_ID` absent).

## Retour arrière

Remettre la cible Preview sur les variables de production rétablit l'état antérieur (previews sur
les données de prod) : à éviter. Le code reste compatible : en production, rien ne change hormis
le refus de démarrer sans `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD` (déjà présents en prod).
