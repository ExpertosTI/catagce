#!/bin/bash
# Rebuild API (imagen más liviana). Ejecutar solo si hace falta nueva versión del API.
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

echo "💾 Espacio en disco:"
df -h / | tail -1

echo "🧹 Limpiar build cache si disco > 85%..."
DISK_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_PCT" -gt 85 ]; then
  docker builder prune -af 2>/dev/null || true
  docker system prune -f 2>/dev/null || true
fi

echo "🏗️  Build api..."
docker compose build api

# Verificar imagen antes de deploy (falla rápido si falta dist/)
echo "🔬 Verificar imagen api..."
docker run --rm catagce-api:latest node -e "require('fs').accessSync('dist/main.js')"
docker run --rm catagce-api:latest node -e "require('@catagce/db')"

echo "🔬 Verificar bootstrap Nest (5s, sin red)..."
docker run --rm --name api-boot-test catagce-api:latest sh -c 'timeout 5 node dist/main.js 2>&1 || true' | tail -5

echo "🚢 Deploy stack..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Reiniciar api (rollback si falla)..."
docker service update --force \
  --update-failure-action rollback \
  --update-order start-first \
  catagce_api

sleep 60
bash scripts/ensure-api-db-env.sh
bash scripts/diagnose-server.sh
