#!/bin/bash
# Pull imágenes desde GHCR y actualiza solo api/web (~1-3 min, sin build en servidor)
#
# Setup único en el servidor (.env):
#   GHCR_USER=tu-usuario-github
#   GHCR_TOKEN=ghp_xxxx   # PAT con read:packages
#
# Uso:
#   git pull && bash scripts/pull-deploy.sh
#   bash scripts/pull-deploy.sh api|web|all
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

REGISTRY=ghcr.io/expertosti
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo main)
TARGET=${1:-auto}
UPDATED_API=false

read_env() {
  grep "^${1}=" .env 2>/dev/null | cut -d= -f2- || true
}

GHCR_USER=$(read_env GHCR_USER)
GHCR_TOKEN=$(read_env GHCR_TOKEN)

if [ -n "$GHCR_TOKEN" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-ExpertosTI}" --password-stdin 2>/dev/null || true
fi

git fetch --all && git reset --hard origin/main
SHA=$(git rev-parse --short HEAD)

pull_api() {
  local tag=main
  echo "📥 Pull API..."
  if docker pull "${REGISTRY}/catagce-api:${SHA}" 2>/dev/null; then
    tag=$SHA
  else
    docker pull "${REGISTRY}/catagce-api:main"
  fi
  local img="${REGISTRY}/catagce-api:${tag}"
  echo "🔄 Update catagce_api → ${img}"
  docker service update \
    --image "$img" \
    --update-failure-action rollback \
    --update-order start-first \
    catagce_api
  UPDATED_API=true
}

pull_web() {
  local tag=main
  echo "📥 Pull Web..."
  if docker pull "${REGISTRY}/catagce-web:${SHA}" 2>/dev/null; then
    tag=$SHA
  else
    docker pull "${REGISTRY}/catagce-web:main"
  fi
  local img="${REGISTRY}/catagce-web:${tag}"
  echo "🔄 Update catagce_web → ${img}"
  docker service update \
    --image "$img" \
    --update-failure-action rollback \
    --update-order start-first \
    catagce_web
}

if [ "$TARGET" = "api" ]; then
  pull_api
elif [ "$TARGET" = "web" ]; then
  pull_web
elif [ "$TARGET" = "all" ]; then
  pull_api
  pull_web
else
  # auto: detect from last commit
  CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD)
  needs_api=false
  needs_web=false
  while IFS= read -r f; do
    case "$f" in
      apps/api/*|packages/db/*|docker-compose.yml) needs_api=true ;;
      apps/buyer-web/*|packages/ui/*) needs_web=true ;;
    esac
  done <<< "$CHANGED"
  $needs_api && pull_api
  $needs_web && pull_web
  if ! $needs_api && ! $needs_web; then
    echo "ℹ️  Sin cambios api/web en último commit. Usa: pull-deploy.sh api|web|all"
    exit 0
  fi
fi

if $UPDATED_API; then
  echo "⏳ Esperando API..."
  sleep 25
  bash scripts/ensure-api-db-env.sh
else
  sleep 10
fi

echo ""
curl -sf https://api.catagce.renace.tech/api/health/ready && echo "" || true
curl -sf -o /dev/null -w "Web: %{http_code}\n" https://catagce.renace.tech/login || true
echo "✅ pull-deploy listo (${SHA})"
