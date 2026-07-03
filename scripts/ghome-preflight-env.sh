#!/usr/bin/env bash
# Valida variables críticas en /opt/ghome/.env antes de desplegar
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ghome}"
cd "$REPO_DIR"

if [ ! -f .env ]; then
  echo "❌ Falta $REPO_DIR/.env"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

errors=0

warn() { echo "⚠️  $*"; }
fail() { echo "❌ $*"; errors=$((errors + 1)); }
ok() { echo "✅ $*"; }

if [ -z "${DB_PASSWORD:-}" ] || [ "$DB_PASSWORD" = "change_this_in_production" ]; then
  fail "DB_PASSWORD no configurado o es el valor por defecto"
else
  ok "DB_PASSWORD definido"
fi

if [ -z "${JWT_SECRET:-}" ]; then
  fail "JWT_SECRET vacío — genere con: openssl rand -base64 32"
elif [ "${#JWT_SECRET}" -lt 32 ]; then
  fail "JWT_SECRET demasiado corto (mín. 32 caracteres)"
elif [ "$JWT_SECRET" = "generate_a_random_string" ] || [ "$JWT_SECRET" = "ghome-dev-secret-change-in-production" ]; then
  fail "JWT_SECRET es un placeholder — use un valor aleatorio"
else
  ok "JWT_SECRET con longitud adecuada"
fi

if [ "${ALLOW_STAFF_REGISTER:-}" = "true" ]; then
  warn "ALLOW_STAFF_REGISTER=true — registro público de admins habilitado"
fi

if [ -n "${ADMIN_PASSWORD:-}" ]; then
  if [ "$ADMIN_PASSWORD" = "demo1234" ] || [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
    fail "ADMIN_PASSWORD débil (no use demo1234 en producción)"
  else
    ok "ADMIN_PASSWORD con longitud adecuada"
  fi
fi

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "Corrija .env y vuelva a ejecutar. Ejemplo:"
  echo "  nano $REPO_DIR/.env"
  echo "  JWT_SECRET=\$(openssl rand -base64 32)"
  exit 1
fi

echo ""
echo "Entorno listo para desplegar."
