#!/usr/bin/env bash
# Aplica parche SQL idempotente de sync WhatsApp ↔ pedidos (no es parte del deploy de código)
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce 2>/dev/null || cd "$(dirname "$0")/.."

SQL_FILE="${1:-scripts/schema-patch-whatsapp-orders.sql}"
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ No existe $SQL_FILE"
  exit 1
fi

DB_PASSWORD=$(grep '^DB_PASSWORD=' .env 2>/dev/null | cut -d= -f2- || true)
DB_NAME=$(grep '^DB_NAME=' .env 2>/dev/null | cut -d= -f2- || echo catagce_prod)
DB_USER=$(grep '^DB_USER=' .env 2>/dev/null | cut -d= -f2- || echo catagce_admin)

CONTAINER=$(docker ps -q -f name=catagce_db | head -1)
if [ -z "$CONTAINER" ]; then
  CONTAINER=$(docker ps -q -f name=catagce-db | head -1)
fi
if [ -z "$CONTAINER" ]; then
  echo "❌ Contenedor Postgres no encontrado"
  exit 1
fi

echo "🔧 Aplicando $SQL_FILE ..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE"
echo "✅ Parche aplicado"
