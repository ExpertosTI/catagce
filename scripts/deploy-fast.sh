#!/bin/bash
# Deploy rápido: solo reconstruye lo que cambió en el último pull (~3-12 min vs ~25 min)
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

BEFORE=$(git rev-parse HEAD)
git fetch --all && git reset --hard origin/main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null || true)
else
  CHANGED=$(git diff --name-only "$BEFORE" "$AFTER")
fi

if [ -z "$CHANGED" ]; then
  echo "ℹ️  Sin cambios detectados en $AFTER"
  echo "   Forzar: bash scripts/rebuild-api.sh | rebuild-web.sh | pull-deploy.sh all"
  exit 0
fi

needs_api=false
needs_web=false

while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    apps/api/*|packages/db/*|docker-compose.yml|apps/api/Dockerfile)
      needs_api=true ;;
    apps/buyer-web/*|apps/buyer-web/Dockerfile)
      needs_web=true ;;
  esac
done <<< "$CHANGED"

# docker-compose con volumen uploads solo afecta api
echo "$CHANGED" | grep -q '^docker-compose.yml$' && needs_api=true

echo ""
echo "═══ Cambios detectados ═══"
echo "$CHANGED" | head -20
[ "$(echo "$CHANGED" | wc -l)" -gt 20 ] && echo "... y más"
echo ""
echo "API:  $needs_api | Web: $needs_web"
echo ""

if ! $needs_api && ! $needs_web; then
  echo "✅ Solo scripts/docs — no hace falta rebuild."
  echo "   Si GHCR está listo: bash scripts/pull-deploy.sh all"
  echo "   Si no: bash scripts/rebuild-api.sh o rebuild-web.sh"
  exit 0
fi

# Preferir pull desde GHCR si hay token (sin build local)
if [ -n "$(grep '^GHCR_TOKEN=' .env 2>/dev/null | cut -d= -f2-)" ]; then
  echo "🚀 Pull desde GHCR (rápido)..."
  if $needs_api && $needs_web; then bash scripts/pull-deploy.sh all
  elif $needs_api; then bash scripts/pull-deploy.sh api
  else bash scripts/pull-deploy.sh web
  fi
  exit 0
fi

if $needs_api; then
  echo "🚀 Rebuild API..."
  bash scripts/rebuild-api.sh
elif $needs_web; then
  echo "🚀 Rebuild Web..."
  bash scripts/rebuild-web.sh
fi

if $needs_api && $needs_web; then
  echo "🚀 Rebuild Web (API ya hecho)..."
  bash scripts/rebuild-web.sh
fi

echo ""
echo "✅ Deploy selectivo listo — https://catagce.renace.tech"
