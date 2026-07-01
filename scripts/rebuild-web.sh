#!/bin/bash
# Rebuild y deploy SOLO web (API URL + UI). No toca la API.
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

echo "🏗️  Build web..."
docker compose build web

echo "🚢 Deploy stack..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Reiniciar web (rollback si falla)..."
docker service update --force \
  --update-failure-action rollback \
  --update-order start-first \
  --limit-memory 768M \
  catagce_web

sleep 45
echo "═══ Estado web ═══"
docker service ps catagce_web --no-trunc 2>/dev/null | head -5
curl -sf -o /dev/null -w "Web HTTP %{http_code}\n" https://catagce.renace.tech/login || true
curl -sf -o /dev/null -w "Web /dashboard/products/new %{http_code}\n" https://catagce.renace.tech/dashboard/products/new || true
