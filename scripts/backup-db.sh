#!/usr/bin/env bash
# Catagce — pg_dump antes de deploy (principio Renace #5)
# Uso: bash scripts/backup-db.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KEEP="${BACKUP_KEEP:-14}"
DEST="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$DEST"

DB_NAME=$(grep '^DB_NAME=' .env 2>/dev/null | cut -d= -f2- || echo catagce_prod)
DB_USER=$(grep '^DB_USER=' .env 2>/dev/null | cut -d= -f2- || echo catagce_admin)

CONTAINER=$(docker ps -q -f name=catagce_db | head -1)
if [ -z "$CONTAINER" ]; then
  CONTAINER=$(docker ps -q -f name=catagce-db | head -1)
fi
if [ -z "$CONTAINER" ]; then
  echo "⚠️  Contenedor Postgres no encontrado — backup omitido"
  exit 0
fi

stamp="$(date +%Y%m%d_%H%M%S)"
out="$DEST/pre_deploy_${stamp}.dump"
echo "💾 Backup DB → $out"
if docker exec -i "$CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$out"; then
  size="$(du -h "$out" | awk '{print $1}')"
  echo "   ✓ ${size}"
else
  echo "⚠️  pg_dump falló — continúa el deploy sin backup"
  rm -f "$out"
  exit 0
fi

# Rotación: conservar los N más recientes
ls -1t "$DEST"/pre_deploy_*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r f; do
  [ -n "$f" ] && rm -f "$f" && echo "   🗑  rotado $(basename "$f")"
done || true

echo "✅ Backup listo (keep=$KEEP)"
