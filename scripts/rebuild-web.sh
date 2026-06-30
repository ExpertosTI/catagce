#!/bin/bash
# Rebuild y deploy SOLO web (API URL + UI). No toca la API.
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

echo "🏗️  Build web..."
docker compose build web

echo "🚢 Deploy stack..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Reiniciar web..."
docker service update --force catagce_web

sleep 20
echo "═══ Estado web ═══"
docker service ps catagce_web --no-trunc 2>/dev/null | head -3
curl -sf -o /dev/null -w "Web HTTP %{http_code}\n" https://catagce.renace.tech/login || true
