# Déploiement sur le serveur (Dokploy) et bascule depuis Vercel + Neon

La pile de production est `compose.yaml` : front (nginx), API (Node), cron et sauvegarde. La base
Postgres 18 est **hors de la pile** : un service de base de données de Dokploy, dans le même projet,
que l'API et la sauvegarde joignent par `dokploy-network`. Dokploy ne construit rien ; il tire les
images publiées sur GHCR par la CI (`candidash-web`, `candidash-api`, `candidash-backup`). Le trafic
arrive par le tunnel Cloudflare, puis le Traefik de Dokploy. Les fichiers (CV, lettres) restent sur
R2.

Tant que l'étape « Bascule » n'est pas faite, Vercel et Neon restent la production : tout ce qui
précède est sans impact.

## Mise en place (une fois)

1. **Paquets GHCR** : les trois paquets doivent être lisibles par le serveur. Publics, rien à faire ;
   privés, déclarer `ghcr.io` dans les registres de Dokploy avec un jeton `read:packages`.
2. **Bucket de sauvegarde** : bucket R2 privé (`candidash-backups`), jeton d'API limité à ce bucket,
   règle de cycle de vie qui supprime les objets après la durée voulue (30 jours par exemple).
3. **Dokploy** : dans le projet, un service **Database** PostgreSQL 18, sans port externe ; puis un
   service de type **Compose** dont la source est le dépôt : fournisseur **Git**, URL
   `https://github.com/j-ned/candidash-app.git`, branche `master`, Compose Path
   `./deploy/compose.yaml` (la valeur par défaut, `./docker-compose.yml`, échoue avec « Compose file
   not found »). **Auto Deploy désactivé** : c'est la CI qui déclenche, une fois les images
   publiées. Dokploy clone le dépôt à chaque déploiement : une modification de
   `deploy/compose.yaml` part donc à la fusion, comme le code. La CI valide ce fichier avant
   (`.github/scripts/compose.check.sh`). En mode **Raw**, Dokploy rejouerait le YAML collé dans son éditeur
   et ignorerait le dépôt.
4. **Environment** : coller `candidash.env.example` rempli. `POSTGRES_HOST`, `POSTGRES_USER`,
   `POSTGRES_DB` et `POSTGRES_PASSWORD` se recopient de la fiche du service de base (Internal
   Credentials). `JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, les
   `S3_*` et `CRON_SECRET` se reprennent à l'identique du projet Vercel. Le mail part par l'API de
   Resend (`RESEND_API_KEY`, `MAIL_FROM` sur un domaine vérifié), plus par SMTP.
5. **Domains** : service `candidash-web`, port `8080`, HTTP (le TLS est celui de Cloudflare), pour
   `candidash.nedellec-julien.fr`. L'API n'a pas de domaine à elle : le front la relaie sous
   `/api/`. Tant que l'extension publiée appelle `api-candidash.nedellec-julien.fr`, ajouter ce
   second domaine **sur le même service `candidash-web`**, port `8080` : le relais répond aussi sous
   ce nom. Le bouton _Preview Compose_ doit montrer `candidash-web`, `candidash-api` et
   `candidash-backup` sur `default` **et** `dokploy-network`, et `candidash-cron` sur `default`
   seulement.
6. **Premier déploiement** à la main (bouton Deploy) : l'API crée le schéma par ses migrations. Puis
   import des données (ci-dessous).
7. **Déclenchement par la CI** : secrets du dépôt `DOKPLOY_URL` (adresse du panneau, sans `/` final),
   `DOKPLOY_API_KEY` (profil → API) et `DOKPLOY_COMPOSE_ID` (dernier segment de l'URL du service). Le
   panneau étant derrière Cloudflare Access, il faut aussi un jeton de service (Zero Trust → Service
   Tokens), autorisé par une règle **Service Auth** sur l'application du panneau, dans
   `CF_ACCESS_CLIENT_ID` et `CF_ACCESS_CLIENT_SECRET`. Variable facultative `DEPLOY_HEALTH_URL`
   (`https://candidash.nedellec-julien.fr/api/v1/health`) pour sonder le site après coup. Tant que les
   secrets Dokploy manquent, la CI publie les images sans déployer ; une fois posés, une redirection
   ou un refus la font échouer.

## Adresse du visiteur et limites de débit

Derrière le tunnel, Traefik puis le front ne voient que l'adresse du tunnel. L'API lit donc l'adresse
du visiteur dans `CF-Connecting-IP` (`CLIENT_IP_HEADER`, posé par le compose), que le front relaie tel
quel : sans cela, tous les visiteurs partageraient les mêmes limites de débit. Cet en-tête n'est
digne de confiance que si **rien d'autre que le tunnel ne joint Traefik** : aucun port 80/443 du
serveur ouvert sur Internet (redirection de la box comprise), sinon un client choisirait lui-même
l'adresse comptée.

## Import des données depuis Neon

Dump avec un client de la version de la base d'origine (18), URL Neon **directe** (sans `-pooler`) :

```bash
read -rs NEON_URL
```

```bash
(umask 077; docker run --rm -e NEON_URL="$NEON_URL" postgres:18-alpine sh -c 'pg_dump "$NEON_URL" -Fc --no-owner --no-acl' > ~/candidash-neon.dump; echo "code=$?")
```

Restauration par-dessus le schéma créé au premier déploiement, dans une seule transaction qui ne
laisse rien en cas d'erreur. `<db>` est le conteneur du service de base de Dokploy, `<api>` le conteneur
`candidash-api` (`docker ps`) :

```bash
docker exec -i <db> sh -c 'pg_restore --clean --if-exists --single-transaction --no-owner --no-acl --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ~/candidash-neon.dump; echo "code=$?"
```

```bash
docker restart <api>
```

Le redémarrage rejoue les migrations que Neon n'avait pas. Comparer ensuite les comptes de lignes
des deux côtés et vérifier la connexion, puis effacer le fichier, qui contient les données :
`shred -u ~/candidash-neon.dump; unset NEON_URL`.

## Bascule (coupure de quelques minutes)

1. **Geler les écritures** : Vercel → projet `candidash-app` → _Settings_ → _Domains_ → retirer les
   deux domaines, et désactiver son cron. Plus rien n'écrit dans Neon.
2. Refaire l'import des données ci-dessus (dump final).
3. Cloudflare → Zero Trust → tunnel du serveur → _Public Hostnames_ : ajouter
   `candidash.nedellec-julien.fr` et `api-candidash.nedellec-julien.fr`, vers le même service que
   les autres sites du serveur (le Traefik de Dokploy). Cloudflare remplace alors les
   enregistrements DNS qui pointaient vers Vercel ; s'il refuse parce qu'ils existent, les supprimer
   d'abord dans la zone DNS.
4. Vérifier : `https://candidash.nedellec-julien.fr/api/v1/health`, connexion depuis le front,
   2FA, dépôt et téléchargement d'un CV, export PDF, ajout depuis l'extension, console du navigateur
   sans erreur CSP, et les journaux de `candidash-cron` le lendemain de 7 h UTC.

## Retour arrière

Retirer les deux _Public Hostnames_ du tunnel, recréer dans la zone DNS les enregistrements vers
Vercel, rattacher les deux domaines au projet Vercel et réactiver son cron. **Les écritures faites
sur le serveur depuis la bascule ne sont pas dans Neon** : si besoin, `pg_dump` de la base du serveur →
`pg_restore` vers Neon.

Le dépôt ne contient plus ce qui servait à Vercel (`vercel.json`, point d'entrée et bundle de la
fonction, lecture de `VERCEL_ENV`) : le projet Vercel ne construit plus `master`. Un retour arrière
repart d'un déploiement antérieur gardé par Vercel, ou d'un commit d'avant ce retrait.

## Sortir la base de la pile (une fois, depuis l'ancienne pile qui embarquait `candidash-db`)

Faite le 14 novembre 2026 ; gardée comme modèle. La base était un service de la pile. La procédure
copie ses données vers le service de base de Dokploy, puis déploie la pile sans base. L'API est arrêtée pendant la copie : compter cinq
minutes où le site s'affiche mais ne permet ni connexion ni enregistrement. À lancer sur le serveur ;
`<ancienne>` est le conteneur `…-candidash-db-1`, `<nouvelle>` celui du service de base
(`docker ps`).

1. Vérifier que la pile joint le service de base par son hôte interne (celui de sa fiche Dokploy) :
   `docker exec <web> nc -z -w 3 <hôte interne> 5432; echo "code=$?"` doit rendre `code=0`.
2. Arrêter les écritures : `docker stop <api> <cron>`.
3. Copier les données, sans fichier intermédiaire, dans une seule transaction. Comptes et noms de
   base s'écrivent en clair : chaque conteneur a ses propres `POSTGRES_*`, et un redéploiement peut
   les avoir changés.

   ```bash
   docker exec <ancienne> pg_dump -Fc --no-owner --no-acl -U <compte> -d <ancienne base> | docker exec -i <nouvelle> pg_restore --clean --if-exists --single-transaction --no-owner --no-acl --exit-on-error -U <compte> -d <nouvelle base>; echo "code=$?"
   ```

4. Comparer les comptes de lignes des deux côtés (`Utilisateurs`, `Annonces`, `Relance`).
5. Dans Environment : ajouter `POSTGRES_HOST`, et mettre `POSTGRES_USER`, `POSTGRES_DB`,
   `POSTGRES_PASSWORD` aux valeurs du service de base. Ne pas croiser hôte et nom de base : ici
   `candidash-db` était l'hôte de l'ancienne et le nom de la nouvelle.
6. Fusionner le nouveau `compose.yaml` (ou Deploy à la main s'il est déjà sur `master`). L'API
   démarre sur la nouvelle base et n'y trouve aucune migration à appliquer.
7. Vérifier : `/api/v1/health`, connexion, une candidature existante, puis
   `docker exec <backup> backup.sh once`.

Le déploiement retire l'ancien conteneur `…-candidash-db-1`, devenu orphelin, mais pas son volume
`…_candidash-db-data` : le garder quelques jours comme retour arrière, puis `docker volume rm`.

**Retour arrière** : remettre les quatre variables à leurs anciennes valeurs, rétablir par un
`git revert` la version précédente de `compose.yaml` et laisser la CI redéployer : la base de la
pile repart sur son volume. Les écritures faites entre-temps sont dans la nouvelle
base : les recopier dans l'autre sens par la même commande, conteneurs inversés.

## Sauvegardes

Le service `candidash-backup` envoie chaque nuit (3 h UTC) un dump chiffré dans le bucket. `<backup>`
est son conteneur.

- Sauvegarde immédiate : `docker exec <backup> backup.sh once`
- Restauration dans une base **vide** : créer la base, puis
  `docker exec -e PGDATABASE=<base> <backup> backup.sh restore <objet>`
- La phrase `BACKUP_PASSPHRASE` se conserve aussi hors du serveur : sans elle, aucune sauvegarde ne
  se déchiffre.
- Un échec n'alerte personne : il s'écrit dans les journaux du conteneur. Regarder le bucket de temps
  en temps, et rejouer une restauration de temps à autre.

## Retour à une version

Dans Environment, fixer `WEB_IMAGE` et/ou `API_IMAGE` sur un tag `sha-<commit>` publié, puis Deploy.
Une migration déjà appliquée ne se défait pas ainsi : l'ancienne image doit tolérer le nouveau schéma
(expand, migrate, contract).

## Après une à deux semaines stables

- Supprimer le projet Vercel et la base Neon (garder un dernier dump), et les anciens services
  Dokploy de Candidash (Backend, Frontend, gotenberg, database). Le service Postgres 18 du projet
  (`Candidash_db`) n'en fait pas partie : c'est la base de production.
- Publier une version de l'extension qui appelle `https://candidash.nedellec-julien.fr`, puis, une
  fois les anciennes versions éteintes, retirer `api-candidash.nedellec-julien.fr` du tunnel et de
  l'onglet Domains.
