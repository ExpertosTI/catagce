#!/usr/bin/env bash
# Solo lectura — no modifica nada. Pegue la salida completa si pide ayuda.
set -uo pipefail
cd /opt/QuickCtgo 2>/dev/null || { echo "❌ /opt/QuickCtgo no existe"; exit 1; }

echo "══════════════════════════════════════════"
echo " CATAGCE QuickCtgo — diagnóstico (read-only)"
echo "══════════════════════════════════════════"
echo ""

echo "▶ Git"
git rev-parse --abbrev-ref HEAD 2>/dev/null || true
git log -1 --oneline 2>/dev/null || true
echo ""

echo "▶ Archivos de configuración (sin valores)"
for f in .env .evolution.local; do
  if [ -f "$f" ]; then
    echo "  ✓ $f existe ($(wc -l < "$f") líneas)"
    grep -E '^[A-Z_]+=' "$f" 2>/dev/null | cut -d= -f1 | sed 's/^/    · /' || true
  else
    echo "  ✗ $f no existe"
  fi
done
echo ""

echo "▶ Servicios Swarm (catagce)"
docker service ls 2>/dev/null | grep -i catagce || echo "  (ninguno)"
echo ""

echo "▶ Estado catagce_api"
docker service ps catagce_api --no-trunc 2>/dev/null | head -5 || echo "  servicio no encontrado"
echo ""

echo "▶ Últimas líneas catagce_api"
docker service logs catagce_api --tail 35 2>&1 || true
echo ""

echo "▶ Health HTTP"
curl -sS -o /dev/null -w "  api.catagce.renace.tech/api/health → HTTP %{http_code}\n" \
  https://api.catagce.renace.tech/api/health 2>/dev/null || echo "  sin respuesta"
curl -sS -o /dev/null -w "  catagce.renace.tech/login → HTTP %{http_code}\n" \
  https://catagce.renace.tech/login 2>/dev/null || echo "  sin respuesta"
echo ""

DB_CONTAINER=$(docker ps -q -f name=catagce_db.1 | head -1)
if [ -z "$DB_CONTAINER" ]; then
  echo "▶ DB: contenedor catagce_db no encontrado"
else
  echo "▶ DB contenedor: $DB_CONTAINER"
  DB_USER=$(grep '^DB_USER=' .env 2>/dev/null | cut -d= -f2- || echo catagce_admin)
  DB_NAME=$(grep '^DB_NAME=' .env 2>/dev/null | cut -d= -f2- || echo catagce_prod)
  echo "  Usuario/DB: ${DB_USER}/${DB_NAME}"
  echo ""
  echo "▶ Tablas en la base (primeras 40):"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LIMIT 40;" 2>&1 || true
  echo ""
  echo "▶ ¿Schema ghome o main?"
  for t in companies staff_users sellers seller_users orders clients; do
    exists=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
      "SELECT 1 FROM information_schema.tables WHERE table_name='$t' LIMIT 1;" 2>/dev/null || echo "")
    if [ "$exists" = "1" ]; then echo "  ✓ tabla $t"; else echo "  · tabla $t (no)"; fi
  done
  echo ""
  echo "▶ ¿Tablas broadcast ya creadas?"
  for t in broadcast_contacts broadcast_campaigns; do
    exists=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
      "SELECT 1 FROM information_schema.tables WHERE table_name='$t' LIMIT 1;" 2>/dev/null || echo "")
    if [ "$exists" = "1" ]; then echo "  ✓ $t"; else echo "  · $t (no)"; fi
  done
fi

echo ""
echo "══════════════════════════════════════════"
echo " Fin diagnóstico — copie TODO este bloque"
echo "══════════════════════════════════════════"
