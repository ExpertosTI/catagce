#!/usr/bin/env bash
# Pull + build + preflight + force update + health check (ejecutar en el servidor)
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ghome}"
cd "$REPO_DIR"

echo "═══ GHome deploy latest ═══"
git pull origin ghome

# Renueva secretos débiles automáticamente (sin hardcodear en el repo)
if bash scripts/ghome-ensure-secrets.sh; then
  :
else
  echo "❌ No se pudieron asegurar los secretos — revise .env"
  exit 1
fi

bash scripts/ghome-preflight-env.sh

# shellcheck disable=SC1091
set -a && source .env && set +a

echo "═══ Sincronizar admin en BD (si aplica) ═══"
bash scripts/ghome-sync-admin-password.sh || echo "⚠️  Sync admin omitido (¿BD sin seed aún?)"

echo "═══ Build imágenes ═══"
docker build -t ghome-api:latest -f apps/api/Dockerfile .
docker build -t ghome-admin:latest -f apps/admin-web/Dockerfile .
docker build -t ghome-portal:latest -f apps/client-portal/Dockerfile .

echo "═══ Actualizar servicios Swarm ═══"
bash scripts/ghome-force-update.sh

echo "═══ Health check ═══"
for i in 1 2 3 4 5; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://api.generalhome.tech/api/health 2>/dev/null || echo "000")
  if [ "$HTTP" = "200" ]; then
    echo "✅ API online (HTTP $HTTP)"
    echo "   Portal: https://generalhome.tech"
    echo "   Admin:  https://admin.generalhome.tech"
    exit 0
  fi
  echo "⏳ API HTTP $HTTP — reintento $i/5..."
  sleep 15
done

echo "⚠️  API no respondió 200 — revise logs:"
echo "   docker service logs ghome_api --tail 40"
exit 1
