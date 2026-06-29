#!/bin/bash
# Aplica el schema completo de Drizzle en producción (Docker Swarm)
set -e
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

export $(grep -v '^#' .env | xargs)
DB_PASSWORD="${DB_PASSWORD:-$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)}"

echo "🗄️  drizzle-kit push → catagce_db..."
docker run --rm --network RenaceNet \
  -e DATABASE_URL="postgres://catagce_admin:${DB_PASSWORD}@catagce_db:5432/catagce_prod" \
  -v "$(pwd):/app" \
  -w /app node:20-alpine sh -c "
    npm install -g pnpm
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    pnpm --filter @catagce/db push
  "
echo "✅ Schema aplicado"
