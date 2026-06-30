#!/bin/bash
# Arreglar login: requiere espacio en disco. Si imágenes ya existen, usa emergency-recover.sh
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

FREE_KB=$(df / | tail -1 | awk '{print $4}')
FREE_MB=$((FREE_KB / 1024))
echo "💾 Espacio libre: ${FREE_MB}MB"

if [ "$FREE_MB" -lt 3000 ]; then
  echo "❌ Menos de 3GB libres. Ejecuta primero: bash scripts/emergency-recover.sh"
  echo "   (Los builds llenan el disco y los contenedores no pueden arrancar)"
  exit 1
fi

export $(grep -v '^#' .env | xargs)

# Si las imágenes ya existen, no rebuild
if docker image inspect catagce-api:latest >/dev/null 2>&1 && docker image inspect catagce-web:latest >/dev/null 2>&1; then
  echo "ℹ️  Imágenes ya existen — deploy sin rebuild"
  docker stack deploy -c docker-compose.yml catagce
  docker service update --force catagce_api
  docker service update --force catagce_web
else
  echo "🏗️  Build api + web..."
  docker compose build api web
  docker stack deploy -c docker-compose.yml catagce
  docker service update --force catagce_api
  docker service update --force catagce_web
fi

sleep 40
bash scripts/diagnose-server.sh
