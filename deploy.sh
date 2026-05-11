#!/usr/bin/env bash
# ==============================================================================
# CATAGCE — DEPLOYMENT SCRIPT
# Target : Docker Swarm + Traefik on VPS
# Branch : deploy/stable-production
# ==============================================================================
set -euo pipefail

PROJECT_DIR="/opt/QuickCtgo"
BRANCH="deploy/stable-production"
STACK_NAME="catagce"

# ── Pre-flight ────────────────────────────────────────────────────────────────
echo "🔍 Pre-flight checks..."
command -v docker >/dev/null 2>&1 || { echo "❌  docker not found";           exit 1; }
[[ -d "$PROJECT_DIR" ]]            || { echo "❌  $PROJECT_DIR not found";     exit 1; }
[[ -f "$PROJECT_DIR/.env" ]]       || { echo "❌  $PROJECT_DIR/.env missing";  exit 1; }

cd "$PROJECT_DIR"

# ── Sync ──────────────────────────────────────────────────────────────────────
echo "📡 Syncing branch '$BRANCH'..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# ── Environment ───────────────────────────────────────────────────────────────
echo "🔐 Loading environment..."
set -a
# shellcheck source=.env
source .env
set +a

# Validate critical secrets
[[ "${JWT_SECRET:-}" =~ .{32,} ]]  || { echo "❌  JWT_SECRET must be ≥ 32 chars"; exit 1; }
[[ -n "${DATABASE_URL:-}" ]]        || { echo "❌  DATABASE_URL is required";       exit 1; }
[[ -n "${DB_PASSWORD:-}" ]]         || { echo "❌  DB_PASSWORD is required";        exit 1; }
[[ -n "${REDIS_HOST:-}" ]]          || { echo "❌  REDIS_HOST is required";         exit 1; }
[[ -n "${REDIS_PORT:-}" ]]          || { echo "❌  REDIS_PORT is required";         exit 1; }

# ── Maintenance (Renace Protocol) ───────────────────────────────────────────
echo "🧹 Cleaning up old build cache to free space..."
docker builder prune -f --filter "until=24h"

# ── Docker images ─────────────────────────────────────────────────────────────
echo "🐳 Building Docker images (using Zero-Build artifacts)..."
# Usamos --pull para asegurar frescura y --parallel 1 para no saturar el disco del VPS
docker compose build --pull


# ── Deploy ────────────────────────────────────────────────────────────────────
echo "🚢 Deploying stack '$STACK_NAME'..."
COMPOSE_TMP=$(mktemp /tmp/catagce-stack-XXXXXX.yml)
# Filtramos la propiedad 'name:' directamente del archivo para preservar comillas en los límites
sed '/^name:/d' docker-compose.yml > "$COMPOSE_TMP"
docker stack deploy -c "$COMPOSE_TMP" "$STACK_NAME" --with-registry-auth

rm -f "$COMPOSE_TMP"

echo ""
echo "✅ Deployment complete"
echo "   Web → https://catalogo.jhosuacomercial.com"
echo "   API → https://api.catalogo.jhosuacomercial.com"
echo ""

# ── Force service image pickup (Renace Protocol) ─────────────────────────────
echo "🔄 Forcing service image refresh..."
docker service update --force ${STACK_NAME}_api 2>/dev/null || true
docker service update --force ${STACK_NAME}_web 2>/dev/null || true

# ── Cleanup ───────────────────────────────────────────────────────────────────
echo "🧹 Final system cleanup..."
docker image prune -f
docker system prune -f --filter "until=24h"

echo ""
docker stack services "$STACK_NAME"
