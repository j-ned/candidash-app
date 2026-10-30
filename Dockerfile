# syntax=docker/dockerfile:1.7

# ==============================================================================
# Étage 1 : sources et dépendances, partagées par le build et les tests
# Node.js 24 (LTS active) sur Alpine
# ==============================================================================
FROM node:24-alpine AS source

# pnpm à la version du champ packageManager (corepack), pas « la dernière » publiée
RUN corepack enable

WORKDIR /app

# pnpm-workspace.yaml porte allowBuilds : sans lui, pnpm install bloque sur
# ERR_PNPM_IGNORED_BUILDS pour esbuild/lmdb/etc.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

# ==============================================================================
# Étage 2 : build Angular en production (prérendu des pages publiques, coquille CSR)
# ==============================================================================
FROM source AS build

RUN pnpm run build --configuration production \
 && test -f dist/ng-candidash-app/browser/index.html \
 && test -f dist/ng-candidash-app/browser/index.csr.html

# ==============================================================================
# Étage de tests, construit par la CI seulement (`--target test`) : l'image de production n'en
# dépend pas, BuildKit ne le construit donc pas pour un `docker build` simple. Même Node que le build.
# ==============================================================================
FROM source AS test

ENV CI=1
# CSP stricte (nonce par requête, pas de 'unsafe-inline') : un attribut style="" dans un template
# serait bloqué en prod.
RUN pnpm lint \
 && pnpm test \
 && if grep -rn ' style="' src/app; then echo "attribut style dans un template"; exit 1; fi

# ==============================================================================
# Étage 3, production : nginx non-root (utilisateur nginx, uid 101), un processus compromis
# n'a pas les droits root
# ==============================================================================
FROM nginxinc/nginx-unprivileged:alpine AS production

COPY --from=build /app/dist/ng-candidash-app/browser/ /usr/share/nginx/html/
COPY docker/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/entrypoint.sh /docker-entrypoint-custom.sh

# Seuls config.json (réécrit au démarrage) et les en-têtes générés appartiennent à nginx.
# Port 80 en non-root : capacité NET_BIND_SERVICE sur le seul binaire nginx, pour ne pas dépendre
# du réglage ip_unprivileged_port_start du réseau (absent en mode host, variable selon l'orchestrateur).
USER root
RUN apk add --no-cache libcap \
    && setcap cap_net_bind_service=+ep /usr/sbin/nginx \
    && apk del libcap \
    && touch /etc/nginx/conf.d/security-headers.inc \
    && chown 101:101 /usr/share/nginx/html/config.json /etc/nginx/conf.d/security-headers.inc
USER 101

EXPOSE 80
CMD ["/docker-entrypoint-custom.sh"]
