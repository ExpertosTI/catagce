#!/usr/bin/env bash
# Catagce — deploy de código SIN reset de DB (producción QuickCtgo)
set -euo pipefail
cd /opt/QuickCtgo

avail_gb() { df -BG / | awk 'NR==2 {gsub(/G/,"",$4); print $4}'; }

echo "📥 Sync código..."
git fetch --all && git reset --hard origin/main

free="$(avail_gb 2>/dev/null || echo 0)"
if [ "${free}" -lt 4 ] 2>/dev/null; then
  echo "⚠️  Disco bajo (${free}G libres). Limpia antes del build:"
  echo "   docker container prune -f && docker image prune -a -f && docker builder prune -af"
  exit 1
fi

echo "🏗️  Build api + web..."
set -a
# shellcheck disable=SC1091
[ -f .env ] && source .env
if [ -f .evolution.local ]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    [ -z "${!key:-}" ] && export "$key=$val"
  done < .evolution.local
fi
set +a

docker compose build --parallel api web

echo "🚢 Deploy stack..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Reiniciar servicios..."
for svc in api web; do
  docker service update --force "catagce_${svc}" && echo "  ✓ catagce_${svc}"
done

if [ -f scripts/catagce-schema-patch.sql ]; then
  echo "🗄️  Parche schema base (idempotente)..."
  db_cid="$(docker ps -qf name=catagce_db | head -1)"
  if [ -n "$db_cid" ]; then
    docker exec -i "$db_cid" psql -U catagce_admin -d catagce_prod < scripts/catagce-schema-patch.sql || true
  fi
fi

# Parches incrementales (planes / encuesta) — mismo patrón que schema-patch.sh
for patch in scripts/schema-patch-plans.sql scripts/schema-patch-encuesta.sql; do
  if [ -f "$patch" ]; then
    echo "🗄️  Aplicando $patch ..."
    bash scripts/schema-patch.sh "$patch" || true
  fi
done

sleep 8
curl -sf https://api.catagce.renace.tech/api/health && echo " ✅ API OK" || echo " ⏳ API arrancando..."

echo "✅ Listo — https://catagce.renace.tech"
echo "   (reset DB: bash scripts/reset-and-seed-server.sh all — solo si lo necesitas)"
