#!/bin/bash
# Rebuild web (API URL + UI) + api, deploy y reiniciar
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

export $(grep -v '^#' .env | xargs)

echo "🏗️  Build web + api..."
docker compose build --no-cache web api

echo "🚢 Deploy stack..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Reiniciar servicios..."
docker service update --force catagce_api
docker service update --force catagce_web

sleep 35
bash scripts/diagnose-server.sh
