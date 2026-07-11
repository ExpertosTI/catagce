#!/usr/bin/env bash
# Catagce — deploy de código SIN reset de DB (producción QuickCtgo)
set -euo pipefail
cd /opt/QuickCtgo

avail_gb() { df -BG / | awk 'NR==2 {gsub(/G/,"",$4); print $4}'; }

echo "📥 Sync código..."
git fetch --all && git reset --hard origin/main

free="$(avail_gb 2>/dev/null || echo 0)"
echo "💾 Disco libre: ${free}G"
if [ "${free}" -lt 4 ] 2>/dev/null; then
  echo "⚠️  Disco bajo (${free}G libres). Limpia antes del build:"
  echo "   docker container prune -f && docker image prune -a -f && docker builder prune -af"
  exit 1
fi

echo "🏗️  Build api + web..."
set -a
# shellcheck disable=SC1091
[ -f .env ] && source .env
if [ -f .evolution.local ]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    [ -z "${!key:-}" ] && export "$key=$val"
  done < .evolution.local
fi
set +a

docker compose build --parallel api web

# Migraciones ANTES de reiniciar API (código nuevo puede depender de tablas nuevas)
if [ -f scripts/catagce-schema-patch.sql ]; then
  echo "🗄️  Parche schema base (idempotente)..."
  db_cid="$(docker ps -qf name=catagce_db | head -1)"
  if [ -n "$db_cid" ]; then
    docker exec -i "$db_cid" psql -U catagce_admin -d catagce_prod < scripts/catagce-schema-patch.sql || true
  fi
fi

for patch in scripts/schema-patch-plans.sql scripts/schema-patch-encuesta.sql scripts/schema-patch-plan-requests.sql; do
  if [ -f "$patch" ]; then
    echo "🗄️  Aplicando $patch ..."
    bash scripts/schema-patch.sh "$patch" || true
  else
    echo "⚠️  Falta $patch en el checkout — revisa git"
  fi
done

echo "🚢 Deploy stack..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Reiniciar servicios..."
api_ok=1
for svc in api web; do
  if ! docker service update --force "catagce_${svc}"; then
    echo "  ✗ catagce_${svc} — update falló"
    [ "$svc" = api ] && api_ok=0
    continue
  fi
  # Solo el UpdateStatus actual + task desired=running (ignorar Failed históricos)
  update_state="$(docker service inspect "catagce_${svc}" --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{end}}' 2>/dev/null || true)"
  running="$(docker service ps "catagce_${svc}" --filter desired-state=running --format '{{.CurrentState}}' 2>/dev/null | head -1 || true)"
  if echo "$update_state" | grep -qi 'rollback'; then
    echo "  ✗ catagce_${svc} — UpdateStatus=$update_state"
    [ "$svc" = api ] && api_ok=0
  elif echo "$running" | grep -qi '^Running'; then
    echo "  ✓ catagce_${svc} (UpdateStatus=${update_state:-n/a})"
  else
    echo "  ✗ catagce_${svc} — sin task Running (state=$running update=$update_state)"
    [ "$svc" = api ] && api_ok=0
  fi
done

sleep 8
curl -sf https://api.catagce.renace.tech/api/health && echo " ✅ API OK" || echo " ⏳ API arrancando..."

if [ "$api_ok" -eq 0 ]; then
  echo ""
  echo "❌ catagce_api no quedó en la imagen nueva. Diagnóstico:"
  echo "   bash scripts/debug-api.sh"
  echo "   bash scripts/recover-api.sh"
  echo "   (si disco ~90%: docker container prune -f && docker image prune -a -f && docker builder prune -af)"
  exit 1
fi

echo "✅ Listo — https://catagce.renace.tech"
echo "   (reset DB: bash scripts/reset-and-seed-server.sh all — solo si lo necesitas)"
