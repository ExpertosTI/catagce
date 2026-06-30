#!/bin/bash
# Arreglar API (404 en login) + redeploy web amarillo
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

echo "💾 Disco:"
df -h / | tail -1
DISK_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_PCT" -gt 85 ]; then
  docker builder prune -af 2>/dev/null || true
fi

export $(grep -v '^#' .env | xargs)

echo "🏗️  Build api (imagen liviana)..."
docker compose build api

echo "🏗️  Build web (amarillo + API URL)..."
docker compose build web

echo "🚢 Deploy..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Reiniciar api + web..."
docker service update --force catagce_api
docker service update --force catagce_web

sleep 40
bash scripts/diagnose-server.sh
curl -sf -o /dev/null -w "API OPTIONS → %{http_code}\n" -X OPTIONS \
  -H "Origin: https://catagce.renace.tech" \
  -H "Access-Control-Request-Method: POST" \
  https://api.catagce.renace.tech/api/auth/login || echo "API aún no responde"
