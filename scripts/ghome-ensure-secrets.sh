#!/usr/bin/env bash
# Genera o renueva secretos débiles/faltantes en .env (sin hardcodear en el repo).
# Usa datos del propio entorno (slug, IP del servidor, hostname) + entropía openssl.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ghome}"
cd "$REPO_DIR"

ENV_FILE="${ENV_FILE:-$REPO_DIR/.env}"
CRED_DIR="${CRED_DIR:-/root}"
STAMP=$(date +%Y%m%d-%H%M%S)
CRED_FILE="${CRED_DIR}/.ghome-credentials-${STAMP}.txt"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ No existe $ENV_FILE — copie desde .env.example primero"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source "$ENV_FILE" && set +a

is_weak_db() {
  [ -z "${DB_PASSWORD:-}" ] || [ "$DB_PASSWORD" = "change_this_in_production" ]
}

is_weak_jwt() {
  [ -z "${JWT_SECRET:-}" ] \
    || [ "${#JWT_SECRET}" -lt 32 ] \
    || [ "$JWT_SECRET" = "generate_a_random_string" ] \
    || [ "$JWT_SECRET" = "ghome-dev-secret-change-in-production" ]
}

is_weak_admin() {
  [ -z "${ADMIN_PASSWORD:-}" ] \
    || [ "$ADMIN_PASSWORD" = "demo1234" ] \
    || [ "${#ADMIN_PASSWORD}" -lt 12 ]
}

# Tokens de contexto (no son la contraseña; solo sal para mezclar)
SLUG="${NEXT_PUBLIC_COMPANY_SLUG:-ghome}"
HOST_SHORT="$(hostname -s 2>/dev/null | tr -cd 'a-zA-Z0-9' | head -c 12)"
SERVER_IP="${GHOME_SERVER_IP:-$(curl -s --max-time 3 ifconfig.me 2>/dev/null || curl -s --max-time 3 icanhazip.com 2>/dev/null || echo "")}"
IP_DIGITS="$(printf '%s' "$SERVER_IP" | tr -cd '0-9' | head -c 10)"
ENTROPY="$(openssl rand -hex 16)"

gen_mixed_password() {
  local purpose="$1"
  local rnd_hex rnd_b64 mix
  rnd_hex="$(openssl rand -hex 8)"
  rnd_b64="$(openssl rand -base64 18 | tr -d '/+=' | head -c 14)"
  mix="$(printf '%s|%s|%s|%s|%s' "$SLUG" "$purpose" "$IP_DIGITS" "$HOST_SHORT" "$ENTROPY" \
    | sha256sum | cut -c1-10)"
  # Formato: Slug + dígitos IP + aleatorio + hash parcial + símbolo
  local slug_cap first rest
  first="$(printf '%.1s' "$SLUG" | tr 'a-z' 'A-Z')"
  rest="$(printf '%s' "$SLUG" | cut -c2-)"
  slug_cap="${first}${rest}"
  printf '%s%s-%s-%s!' "$slug_cap" "${IP_DIGITS:0:4}" "$rnd_b64" "$mix"
}

gen_jwt_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

gen_db_password() {
  openssl rand -base64 32 | tr -d '/+=\n' | head -c 28
}

upsert_env() {
  local key="$1"
  local value="$2"
  local tmp="${ENV_FILE}.new.$$"
  if [ -f "$ENV_FILE" ]; then
    grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  else
    : > "$tmp"
  fi
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
}

CHANGED=0
NEW_DB=""
NEW_JWT=""
NEW_ADMIN=""

if is_weak_db; then
  NEW_DB="$(gen_db_password)"
  upsert_env "DB_PASSWORD" "$NEW_DB"
  upsert_env "DATABASE_URL" "postgres://ghome_admin:${NEW_DB}@ghome-db:5432/ghome_prod"
  CHANGED=1
  echo "🔐 DB_PASSWORD generado"
fi

if is_weak_jwt; then
  NEW_JWT="$(gen_jwt_secret)"
  upsert_env "JWT_SECRET" "$NEW_JWT"
  CHANGED=1
  echo "🔐 JWT_SECRET generado"
fi

if is_weak_admin; then
  NEW_ADMIN="$(gen_mixed_password admin)"
  upsert_env "ADMIN_PASSWORD" "$NEW_ADMIN"
  if [ -z "${ADMIN_EMAIL:-}" ]; then
    upsert_env "ADMIN_EMAIL" "admin@generalhome.tech"
  fi
  CHANGED=1
  echo "🔐 ADMIN_PASSWORD generado"
fi

if [ "$CHANGED" -eq 0 ]; then
  echo "✅ Todos los secretos en .env ya cumplen la política de seguridad"
  exit 0
fi

# Guardar credenciales una sola vez (fuera del repo, permisos restrictivos)
{
  echo "GHome — credenciales generadas $STAMP"
  echo "Servidor: ${SERVER_IP:-desconocido} · slug: $SLUG"
  echo "Archivo .env: $ENV_FILE"
  echo ""
  [ -n "$NEW_DB" ] && echo "DB_PASSWORD=$NEW_DB"
  [ -n "$NEW_JWT" ] && echo "JWT_SECRET=$NEW_JWT"
  [ -n "$NEW_ADMIN" ] && echo "ADMIN_EMAIL=${ADMIN_EMAIL:-admin@generalhome.tech}" && echo "ADMIN_PASSWORD=$NEW_ADMIN"
  echo ""
  echo "Guarde este archivo en un gestor de contraseñas y elimínelo del servidor cuando ya lo haya copiado:"
  echo "  rm -f $CRED_FILE"
} | tee "$CRED_FILE" >/dev/null

chmod 600 "$CRED_FILE"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  GUARDE ESTAS CREDENCIALES (solo se muestran esta vez)"
echo "  Copia segura: $CRED_FILE  (chmod 600)"
echo "══════════════════════════════════════════════════════════"
cat "$CRED_FILE"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "Siguiente paso recomendado:"
echo "  bash scripts/ghome-sync-admin-password.sh   # si la BD ya existe"
echo "  bash scripts/ghome-fix-db.sh              # si cambió DB_PASSWORD"
echo "  bash scripts/ghome-deploy-latest.sh"
