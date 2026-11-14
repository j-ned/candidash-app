#!/usr/bin/env bash
# Garanties de l'image de l'API, jugées sur un conteneur réel face à un Postgres vide.
# Usage : ci/verify-image.sh <image>
set -euo pipefail
image=${1:?image attendue}
here=$(cd "$(dirname "$0")/.." && pwd)
id="candidash-verify-api-$$"

cleanup() {
  docker rm -f "$id-api" "$id-db" >/dev/null 2>&1 || true
  docker network rm "$id" >/dev/null 2>&1 || true
}
trap cleanup EXIT
fail() { echo "ÉCHEC : $1" >&2; docker logs "$id-api" 2>&1 | tail -20 >&2 || true; exit 1; }

# Attend qu'une commande réussisse, 60 s au plus.
wait_for() {
  local label=$1; shift
  for _ in $(seq 1 60); do "$@" >/dev/null 2>&1 && return 0; sleep 1; done
  fail "$label"
}

# Valeurs factices : aucun service externe n'est contacté par le démarrage ni par /health.
env_args=(
  -e DATABASE_URL="postgresql://candidash:candidash@$id-db:5432/candidash"
  -e ALLOWED_ORIGINS=https://candidash.example.test
  -e JWT_SECRET=jwt-de-verification -e TOTP_ENCRYPTION_KEY="$(printf '0%.0s' $(seq 1 64))"
  -e S3_ENDPOINT=https://s3.example.test -e S3_ACCESS_KEY=cle -e S3_SECRET_KEY=secret -e S3_BUCKET=candidash
  -e MAIL_USER=robot@example.test -e MAIL_PASSWORD=mdp
)

docker network create "$id" >/dev/null
docker run -d --name "$id-db" --network "$id" \
  -e POSTGRES_USER=candidash -e POSTGRES_PASSWORD=candidash -e POSTGRES_DB=candidash postgres:18-alpine >/dev/null
wait_for "Postgres ne démarre pas" docker exec "$id-db" pg_isready -q -U candidash -h 127.0.0.1

# Production sans SMTP : le conteneur refuse de démarrer.
if docker run --rm --network "$id" "${env_args[@]}" "$image" >/dev/null 2>&1; then
  fail "l'image démarre en production sans MAIL_HOST"
fi

docker run -d --name "$id-api" --network "$id" -p 127.0.0.1::3000 \
  "${env_args[@]}" -e MAIL_HOST=smtp.example.test "$image" >/dev/null
healthy() { test "$(docker inspect -f '{{.State.Health.Status}}' "$id-api")" = healthy; }
wait_for "le conteneur n'est jamais déclaré sain" healthy

port=$(docker port "$id-api" 3000/tcp | head -1 | sed 's/.*://')
health=$(curl -fsS "http://127.0.0.1:$port/api/v1/health") || fail "/api/v1/health ne répond pas"
case "$health" in *'"status":"ok"'*) ;; *) fail "/api/v1/health inattendu : $health" ;; esac

expected=$(grep -c '"tag"' "$here/drizzle/meta/_journal.json")
applied=$(docker exec "$id-db" psql -U candidash -d candidash -Atc 'select count(*) from drizzle.__drizzle_migrations')
test "$applied" = "$expected" || fail "migrations appliquées : $applied, attendues : $expected"

test "$(docker exec "$id-api" id -u)" != 0 || fail "le conteneur tourne en root"

# SIGTERM (docker stop, mise à jour Swarm) : arrêt propre, sans attendre le SIGKILL.
docker stop -t 20 "$id-api" >/dev/null
code=$(docker inspect -f '{{.State.ExitCode}}' "$id-api")
test "$code" = 0 || fail "arrêt sur SIGTERM avec le code $code"

echo "image API vérifiée ($applied migrations)"
