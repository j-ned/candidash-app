# ---- Étape de build ----
# Node.js 24 (LTS active) sur Alpine pour le build
FROM node:24-alpine AS build

# Définit le répertoire de travail dans le conteneur
WORKDIR /app

# pnpm à la version du champ packageManager (corepack), pas « la dernière » publiée
RUN corepack enable

# Copie les fichiers package.json, pnpm-lock.yaml et pnpm-workspace.yaml
# (ce dernier porte allowBuilds — sans lui, pnpm install bloque sur
# ERR_PNPM_IGNORED_BUILDS pour esbuild/lmdb/etc.)
COPY package*.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Installe les dépendances
RUN pnpm install --frozen-lockfile

# Copie tout le code source
COPY . .

# Build l'application Angular en mode production
RUN pnpm run build --configuration production

# ---- Étape de production ----
# nginx non-root (utilisateur nginx, uid 101) : un processus compromis n'a pas les droits root
FROM nginxinc/nginx-unprivileged:alpine

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
