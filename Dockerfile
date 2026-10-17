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
# Utilise Nginx Alpine comme image finale légère
FROM nginx:alpine

# Copie les fichiers buildés depuis l'étape de build
COPY --from=build /app/dist/ng-candidash-app/browser/ /usr/share/nginx/html/

# Configuration Nginx optimisée (gzip + cache + security headers)
RUN printf 'server {\n\
    listen 80;\n\
    # Redirections relatives : le proxy TLS en amont garde le schéma https\n\
    absolute_redirect off;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Security headers\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
    add_header X-Frame-Options "DENY" always;\n\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Prevent caching index.html so new deployments are picked up immediately\n\
    location = /index.html {\n\
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;\n\
        add_header X-Content-Type-Options "nosniff" always;\n\
        add_header X-Frame-Options "DENY" always;\n\
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;\n\
    }\n\
\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|mp4)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    gzip on;\n\
    gzip_vary on;\n\
    gzip_proxied any;\n\
    gzip_comp_level 6;\n\
    gzip_min_length 256;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml application/wasm;\n\
}\n' > /etc/nginx/conf.d/default.conf

# Script d'entrypoint : injecte API_URL, et EXTENSION_ID / FIREFOX_ADDON_URL si définis, au runtime
RUN printf '#!/bin/sh\n\
API_URL="${API_URL:-http://localhost:3000/api/v1}"\n\
CONFIG="\\"apiUrl\\":\\"${API_URL}\\""\n\
[ -n "$EXTENSION_ID" ] && CONFIG="${CONFIG},\\"extensionId\\":\\"${EXTENSION_ID}\\""\n\
[ -n "$FIREFOX_ADDON_URL" ] && CONFIG="${CONFIG},\\"firefoxAddonUrl\\":\\"${FIREFOX_ADDON_URL}\\""\n\
echo "{${CONFIG}}" > /usr/share/nginx/html/config.json\n\
exec nginx -g "daemon off;"\n' > /docker-entrypoint-custom.sh && chmod +x /docker-entrypoint-custom.sh

EXPOSE 80
CMD ["/docker-entrypoint-custom.sh"]
