#!/usr/bin/env bash
# Aplica ADMIN_PASSWORD del .env al usuario admin en Postgres (sin re-seed).
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ghome}"
cd "$REPO_DIR"

# shellcheck disable=SC1091
set -a && source .env && set +a

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@generalhome.tech}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?Falta ADMIN_PASSWORD en .env}"

if [ "$ADMIN_PASSWORD" = "demo1234" ] || [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
  echo "❌ ADMIN_PASSWORD débil — ejecute primero: bash scripts/ghome-ensure-secrets.sh"
  exit 1
fi

DB_CONTAINER=$(docker ps -q -f name=ghome_db.1 | head -1)
if [ -z "$DB_CONTAINER" ]; then
  echo "❌ Contenedor ghome_db no encontrado"
  exit 1
fi

echo "═══ Sincronizar contraseña admin en BD ═══"

HASH=$(docker run --rm -e "ADMIN_PW=${ADMIN_PASSWORD}" node:20-alpine sh -c '
  cd /tmp
  npm init -y >/dev/null 2>&1
  npm install bcryptjs@2.4.3 >/dev/null 2>&1
  node -e "process.stdout.write(require(\"bcryptjs\").hashSync(process.env.ADMIN_PW, 12))"
')

# Escapar comillas simples para SQL
SQL_HASH="${HASH//\'/\'\'}"
SQL_EMAIL="${ADMIN_EMAIL//\'/\'\'}"

COUNT=$(docker exec "$DB_CONTAINER" psql -U ghome_admin -d ghome_prod -t -A -v ON_ERROR_STOP=1 \
  -c "UPDATE staff_users SET password_hash = '${SQL_HASH}', updated_at = NOW() WHERE email = '${SQL_EMAIL}'; SELECT COUNT(*) FROM staff_users WHERE email = '${SQL_EMAIL}';")

if [ "${COUNT:-0}" -lt 1 ]; then
  echo "⚠️  No existe staff con email ${ADMIN_EMAIL} — ejecute seed si es instalación nueva:"
  echo "   bash scripts/ghome-db-init.sh seed"
  exit 1
fi

echo "✅ Contraseña admin actualizada para ${ADMIN_EMAIL}"
