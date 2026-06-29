#!/bin/bash
# Despliegue mínimo — copiar/pegar en el servidor si server-deploy.sh no existe aún
set -e
cd /opt/QuickCtgo

echo "📥 Sync código..."
git fetch --all && git reset --hard origin/main

echo "🧹 Limpiar disco..."
docker system prune -af --filter "until=72h" 2>/dev/null || true
docker builder prune -af 2>/dev/null || true

echo "🏗️  Build api + web..."
export $(grep -v '^#' .env | xargs)
docker compose build --parallel api web

echo "🚢 Deploy stack..."
docker stack deploy -c <(docker compose config) catagce

echo "🔄 Reiniciar servicios..."
for svc in api web media-processor catalog-renderer notifications; do
  docker service update --force "catagce_${svc}" 2>/dev/null && echo "  ✓ catagce_${svc}" || true
done

sleep 8
curl -sf https://api.catagce.renace.tech/api/health && echo " ✅ API OK" || echo " ⏳ API arrancando..."

# Migración DB (columnas nuevas: AI, onboarding)
if [ -f scripts/migrate-prod.sql ]; then
  DB_CONTAINER=$(docker ps -q -f name=catagce_db.1 | head -1)
  if [ -n "$DB_CONTAINER" ]; then
    echo "🗄️  Aplicando migración DB..."
    docker exec -i "$DB_CONTAINER" psql -U catagce_admin -d catagce_prod < scripts/migrate-prod.sql 2>/dev/null || true
  fi
fi

echo "✅ Listo — https://catagce.renace.tech"
