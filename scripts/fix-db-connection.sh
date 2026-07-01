#!/bin/bash
# Arreglar conexión API → Postgres (sin rebuild, ~1 min)
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

echo "🚢 Deploy stack..."
docker stack deploy -c docker-compose.yml catagce

bash scripts/ensure-api-db-env.sh
