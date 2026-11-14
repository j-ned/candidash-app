# Bascule de Vercel + Neon vers le VPS (Dokploy, images GHCR)

Chemin inverse de [bascule.md](bascule.md). Cible : deux applications Dokploy tirées de GHCR
(`candidash-api`, serveur Node ; `candidash-web`, nginx), un Postgres 18 Dokploy, fichiers toujours
sur **R2**, DNS toujours chez **Infomaniak**. Les adresses ne changent pas
(`candidash.nedellec-julien.fr`, `api-candidash.nedellec-julien.fr`) : rien à changer dans
l'extension.

Tant que l'étape 6 n'est pas faite, Vercel et Neon restent la production : tout ce qui précède est
sans impact.

## 1. Sauvegarde et copie de répétition (aucun impact)

```bash
# Poste local : pg_dump 18 par Docker, URL Neon directe (sans -pooler) dans NEON_URL
docker run --rm -e PGURL="$NEON_URL" -u "$(id -u):$(id -g)" -v ~/backups/candidash:/out postgres:18-alpine \
  pg_dump "$PGURL" -Fc --no-owner --no-acl -f "/out/candidash-neon-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Sur le VPS, dans le conteneur du service Postgres 18 de Dokploy (base vide) :

```bash
sudo docker exec -i <pg> sh -c \
  'pg_restore --no-owner --no-acl --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < candidash-neon-….dump
```

Comparer ensuite les comptages par table entre Neon et la base restaurée.

## 2. Images sur GHCR (aucun impact)

Chaque push sur `master` publie `ghcr.io/j-ned/candidash-api` et `ghcr.io/j-ned/candidash-web`
(tags `latest` et SHA du commit), après vérification des deux images (`apps/*/ci/verify-image.sh`).

- GitHub → dépôt → *Settings* → *Secrets and variables* → *Actions* → **Variables** :
  `EXTENSION_ID`, `FIREFOX_ADDON_URL` (mêmes valeurs que dans le projet Vercel ; la publication
  échoue sans elles).
- Après la première publication : GitHub → profil → *Packages* → chaque paquet → *Package settings*
  → *Change visibility* → **Public** (un paquet naît privé ; public, Dokploy le tire sans identifiant).

## 3. Applications Dokploy (aucun impact)

Deux applications de type **Docker image**, dans le projet Candidash :

| Application | Image | Port | Domaine |
|---|---|---|---|
| `candidash-api` | `ghcr.io/j-ned/candidash-api:latest` | 3000 | `api-candidash.nedellec-julien.fr` (HTTPS, Let's Encrypt) |
| `candidash-web` | `ghcr.io/j-ned/candidash-web:latest` | 8080 | `candidash.nedellec-julien.fr` (HTTPS, Let's Encrypt) |

Le certificat Let's Encrypt ne s'obtient qu'une fois le DNS pointé sur le VPS (étape 6).

Variables de `candidash-api` (à **reprendre à l'identique du projet Vercel**, sauf la base) :

- `DATABASE_URL` : l'URL **interne** du service Postgres 18 (affichée par Dokploy).
- `JWT_SECRET` (sinon toutes les sessions et les jetons de l'extension tombent),
  `TOTP_ENCRYPTION_KEY` (sinon la 2FA devient illisible).
- `ALLOWED_ORIGINS=https://candidash.nedellec-julien.fr`
- `S3_ENDPOINT`, `S3_REGION=auto`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM_NAME`, `MAIL_FROM_ADDRESS`,
  `CONTACT_RECIPIENT`
- `CRON_SECRET`

`APP_ENV=production` et `PORT=3000` sont posés par l'image : sans SMTP ou sans S3, le conteneur
refuse de démarrer. `candidash-web` n'a aucune variable (sa configuration est écrite au build).

Au démarrage, l'API applique les migrations en attente puis écoute. Les deux images portent un
`HEALTHCHECK` ; pour qu'un déploiement en échec garde l'ancienne version, régler dans *Advanced* →
*Swarm Settings* → *Update Config* :

```json
{ "Parallelism": 1, "Delay": 10000000000, "FailureAction": "rollback", "Order": "start-first" }
```

**Cron quotidien** : `candidash-api` → *Schedules* → tâche d'application, `0 7 * * *` (vérifier le
fuseau affiché par Dokploy : Vercel le lançait à 7 h UTC), commande :

```bash
sh -c 'wget -q -O - --header "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/v1/cron/daily'
```

Ne l'activer qu'à l'étape 6 : avant, il enverrait les relances en double avec le cron Vercel.

## 4. Déploiement automatique (aucun impact)

Dokploy → profil → créer un jeton d'API, puis secrets GitHub Actions du dépôt :

| Secret | Valeur |
|---|---|
| `DOKPLOY_URL` | Adresse du panneau Dokploy, joignable depuis Internet (`https://…`, sans `/` final) |
| `DOKPLOY_API_KEY` | Le jeton d'API |
| `DOKPLOY_API_APP_ID`, `DOKPLOY_WEB_APP_ID` | `applicationId` des deux applications (`GET $DOKPLOY_URL/api/project.all` avec l'en-tête `x-api-key`) |

Sans ces secrets, la CI publie les images et le déploiement reste manuel (*Deploy* dans Dokploy).
**À vérifier au premier déploiement** : que Dokploy re-tire bien `latest` (comparer le SHA de
l'image en service au commit ; la doc ne le garantit pas). Sinon, pointer l'application sur le tag
SHA.

## 5. Répétition (aucun impact)

Avec la copie de l'étape 1 et avant tout changement DNS, depuis le VPS :

```bash
sudo docker exec <conteneur candidash-api> wget -q -O - http://127.0.0.1:3000/api/v1/health
```

Puis, depuis le poste local, en forçant la résolution vers le VPS (le certificat n'existe pas
encore, d'où `-k`) :

```bash
curl -k --resolve api-candidash.nedellec-julien.fr:443:82.64.148.159 \
  https://api-candidash.nedellec-julien.fr/api/v1/health
curl -k -I --resolve candidash.nedellec-julien.fr:443:82.64.148.159 https://candidash.nedellec-julien.fr/
```

## 6. Bascule (coupure de quelques minutes)

1. **Geler les écritures** : Vercel → projet `candidash-app` → *Settings* → *Domains* → retirer les
   deux domaines (ou mettre le projet en pause), et désactiver son cron. Plus rien n'écrit dans Neon.
2. Dokploy → arrêter `candidash-api`.
3. Refaire le dump de l'étape 1, puis le restaurer **par-dessus** la copie de répétition :
   `pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error …`. Recomparer les comptages.
4. Démarrer `candidash-api` (il rejoue les migrations qui manquaient à Neon).
5. Infomaniak → zone `nedellec-julien.fr` : A de `candidash` et `api-candidash` → **82.64.148.159**
   (TTL 5 min). Garder des A, pas de CNAME (TXT de vérification Google sur `candidash`).
6. Attendre les certificats Let's Encrypt, activer la tâche planifiée de l'étape 3.
7. Vérifier : `/api/v1/health`, connexion depuis le front, 2FA, dépôt et téléchargement d'un CV,
   export PDF, ajout depuis l'extension, console du navigateur sans erreur CSP, puis dans les logs
   que la limite de débit voit bien l'adresse du visiteur (en-tête `X-Real-IP` posé par Traefik) et
   non une adresse interne de Docker.

## 7. Retour arrière

Remettre les A sur l'adresse Vercel (76.76.21.21), rattacher les deux domaines au projet Vercel,
réactiver son cron, désactiver la tâche planifiée Dokploy. **Les écritures faites sur le VPS depuis
la bascule ne sont pas dans Neon** : si besoin, `pg_dump` du Postgres Dokploy → `pg_restore` Neon.

## 8. Après une à deux semaines stables

- Sauvegardes planifiées du Postgres Dokploy vers R2 (*Backups* du service), et un essai de
  restauration.
- Supprimer le projet Vercel et la base Neon (garder un dernier dump), le fichier
  `~/.candidash-neon.env`, les anciens services Dokploy (Backend, Frontend, gotenberg, database).
- Retirer du dépôt ce qui ne sert plus qu'à Vercel : `vercel.json`, `apps/api/server.js`, le bundle
  `dist/index.js`, la lecture de `VERCEL_ENV`, le job CI `preview-db`, `docs/preview-env.md`.
