# Bascule de Dokploy (Nest + nginx) vers Cloudflare (Hono + Static Assets)

Ordre pensé pour que chaque étape soit réversible et que la coupure se limite à quelques minutes,
au moment du changement d'adresse. Les conteneurs Dokploy restent en place jusqu'à la fin : le
retour arrière consiste à refaire pointer le DNS vers le VPS (étape 11).

**Deux secrets doivent être identiques à ceux de l'API Nest** : `JWT_SECRET` (sinon toutes les
sessions et les jetons de l'extension tombent, et la mesure d'audience change d'identifiants) et
`TOTP_ENCRYPTION_KEY` (sinon la 2FA de chaque compte devient illisible).

## 0. Prérequis

- Compte Cloudflare avec le plan **Workers Paid** (5 $/mois : argon2 a besoin de plus de 10 ms
  de CPU, Rate Limiting et Hyperdrive).
- Accès Infomaniak (serveurs DNS du domaine), Dokploy (VPS) et GitHub.
- Les valeurs actuelles des variables Dokploy : `JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, `MAIL_*`,
  `CONTACT_RECIPIENT` (API) ; `EXTENSION_ID`, `FIREFOX_ADDON_URL` (front).
- Un SMTP joignable en **TLS implicite, port 465** (Infomaniak le propose). Le 587 est refusé :
  la bibliothèque SMTP repasserait en clair si STARTTLS n'était pas annoncé.

## 1. DNS de `nedellec-julien.fr` sur Cloudflare (aucun impact)

1. Cloudflare → *Add a domain* → `nedellec-julien.fr`, plan Free.
2. Comparer les enregistrements importés avec ceux d'Infomaniak, **un par un** : MX, SPF (TXT),
   DKIM, DMARC, et tous les A/CNAME. Un MX oublié coupe la messagerie du domaine.
3. Laisser `candidash` et `api-candidash` en **DNS only** (nuage gris) : Traefik garde ses
   certificats tant que le VPS sert l'application.
4. Infomaniak → domaine → serveurs DNS → remplacer par les deux serveurs donnés par Cloudflare.
5. Attendre que la zone soit **Active** dans Cloudflare (de quelques minutes à 24 h).

## 2. TLS sur Postgres (aucun impact)

Hyperdrive exige une base qui accepte TLS. `ssl = on` accepte TLS sans l'imposer : l'API Nest
continue de se connecter comme avant.

Sur le VPS (remplacer `<pg>` par le nom du conteneur Postgres, `<user>` par son utilisateur) :

```bash
openssl req -new -x509 -days 3650 -nodes -subj "/CN=candidash-db" -keyout server.key -out server.crt
docker cp server.crt <pg>:/var/lib/postgresql/data/server.crt
docker cp server.key <pg>:/var/lib/postgresql/data/server.key
docker exec <pg> sh -c 'chown postgres:postgres $PGDATA/server.* && chmod 600 $PGDATA/server.key'
docker exec <pg> psql -U <user> -c "ALTER SYSTEM SET ssl = on;" -c "SELECT pg_reload_conf();"
docker exec <pg> psql -U <user> -c "SHOW ssl;"   # doit répondre on
rm server.key server.crt
```

## 3. Cloudflare Tunnel vers Postgres (aucun impact)

1. Cloudflare → *Networking* → *Tunnels* → *Create a tunnel* → `candidash-db`, type Docker.
2. Ajouter sur Dokploy un service `cloudflare/cloudflared` avec la commande affichée
   (`tunnel run --token …`), **dans le même réseau Docker que Postgres**. Attendre *Healthy*.
3. *Published application routes* → hostname `db-candidash.nedellec-julien.fr`, type **TCP**,
   URL `<nom-du-service-postgres>:5432`.
4. *Zero Trust* → *Access controls* → *Service credentials* → *Service Tokens* → créer
   `candidash-hyperdrive`, durée **Non-expiring** ; noter *Client ID* et *Client Secret*.
5. *Access controls* → *Applications* → *Self-hosted* → hostname `db-candidash…` ; politique
   **Service Auth** incluant ce jeton ; aucun fournisseur d'identité ; durée de session
   *No duration, expires immediately*.

Postgres n'est exposé sur aucun port public : seul le jeton ouvre le tunnel.

## 4. Hyperdrive (aucun impact)

```bash
cd hono-candidash-api
pnpm exec wrangler login
pnpm exec wrangler hyperdrive create candidash-db \
  --host=db-candidash.nedellec-julien.fr \
  --user=<user> --password=<mot de passe> --database=<base> \
  --access-client-id=<Client ID> --access-client-secret=<Client Secret>
```

Reporter l'`id` renvoyé dans `wrangler.jsonc` (`hyperdrive[0].id`).

## 5. R2 (aucun impact)

Vérifier que le bucket `candidash-app` (celui de `S3_BUCKET`) est dans **ce** compte
Cloudflare : le binding `FILES` y lit les CV/LM existants, mêmes clés `<userId>/<jobTrackId>/…`.

## 6. Secrets du Worker API (aucun impact)

```bash
for name in JWT_SECRET TOTP_ENCRYPTION_KEY MAIL_HOST MAIL_PORT MAIL_USER MAIL_PASSWORD MAIL_FROM_ADDRESS CONTACT_RECIPIENT; do
  pnpm exec wrangler secret put "$name"
done
```

`JWT_SECRET` et `TOTP_ENCRYPTION_KEY` : **valeurs de l'API Nest**. `MAIL_PORT` : `465`.

## 7. Dépôts GitHub et CI

- API : créer le dépôt `hono-candidash-api`, pousser `master`. Secrets du dépôt :
  `CLOUDFLARE_API_TOKEN` (jeton *Edit Cloudflare Workers*) et `CLOUDFLARE_ACCOUNT_ID` ;
  environnement `production`.
- Front : mêmes secrets dans `ng-candidash-app`. Ne pas encore fusionner
  `feat/cloudflare-front` (sa fusion déploie le front, étape 10).

## 8. Répétition sur workers.dev (aucun impact)

Déployer l'API sans prendre l'adresse publique **ni les cron** (l'API Nest envoie encore les
relances : les deux en même temps doubleraient les emails). Dans une copie de travail, retirer
temporairement `routes` et `triggers` de `wrangler.jsonc` et ajouter `"workers_dev": true`, puis :

```bash
pnpm exec wrangler deploy
curl https://candidash-api.<sous-domaine>.workers.dev/api/v1/health      # {"status":"ok",…}
pnpm exec wrangler tail                                                 # logs en direct
```

Tester une connexion avec un vrai compte (`POST /api/v1/auth/login`) : elle valide Hyperdrive,
argon2 et `JWT_SECRET`. Tester `POST /api/v1/accounts/forgot-password` sur sa propre adresse :
il valide le SMTP en 465. Annuler ensuite ces modifications de `wrangler.jsonc`.

## 9. Bascule de l'API (coupure de 1 à 2 minutes)

1. Cloudflare → DNS → supprimer l'enregistrement `api-candidash` (celui du VPS).
2. `pnpm exec wrangler deploy` (ou fusion sur `master` : la CI déploie) : le domaine
   personnalisé est créé avec son certificat.
3. **Arrêter le conteneur de l'API Nest** sur Dokploy (pas le supprimer) : sinon ses relances
   horaires partent en double avec les cron du Worker.
4. Vérifier : `curl https://api-candidash.nedellec-julien.fr/api/v1/health`, connexion depuis le
   front actuel, ajout depuis l'extension.

## 10. Bascule du front

1. Renseigner `EXTENSION_ID` et `FIREFOX_ADDON_URL` dans `ng-candidash-app/wrangler.jsonc`.
2. Fusionner `feat/pdf-navigateur` puis `feat/cloudflare-front` : la CI teste puis déploie.
3. Cloudflare → DNS → supprimer l'enregistrement `candidash` (VPS), puis relancer le job *Deploy*
   (ou `pnpm cf:deploy`) pour créer le domaine personnalisé.
4. Vérifier : accueil, `/dashboard`, connexion, 2FA, dépôt et téléchargement d'un CV, export PDF,
   console du navigateur sans erreur CSP.

## 11. Retour arrière

Recréer dans Cloudflare les enregistrements A `api-candidash` et/ou `candidash` vers l'IP du VPS
(DNS only), retirer le domaine personnalisé du Worker concerné, et redémarrer le conteneur Nest.
Les données sont communes (même Postgres, même R2) : rien à resynchroniser.

## 12. Après une à deux semaines stables

- Supprimer sur Dokploy les conteneurs API Nest, nginx (front) et Gotenberg. Garder Postgres et
  `cloudflared`.
- Archiver le dépôt `nest-candidash-app`.

## Migrations de schéma, ensuite

La base n'est joignable que par le tunnel. Depuis un poste avec `cloudflared` :

```bash
cloudflared access tcp --hostname db-candidash.nedellec-julien.fr --url localhost:15432 \
  --service-token-id <Client ID> --service-token-secret <Client Secret> &
DATABASE_URL="postgresql://<user>:<mot de passe>@localhost:15432/<base>?sslmode=require" pnpm db:migrate
```

Lancer la migration **avant** de déployer le code qui en dépend.
