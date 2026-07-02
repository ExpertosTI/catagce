#!/usr/bin/env bash
# Libera espacio en disco antes de docker build (ENOSPC)
set -euo pipefail

echo "═══ Espacio en disco (antes) ═══"
df -h / /var/lib/docker 2>/dev/null || df -h /

echo ""
echo "═══ Limpiando caché Docker ═══"
docker builder prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true
docker container prune -f 2>/dev/null || true

# Imágenes huérfanas de builds viejos (no toca las en uso por swarm)
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep -E '<none>|ghome-' | awk '{print $2}' | xargs -r docker rmi -f 2>/dev/null || true

echo ""
echo "═══ Espacio en disco (después) ═══"
df -h / /var/lib/docker 2>/dev/null || df -h /

echo ""
echo "✅ Limpieza lista. Ahora: bash scripts/deploy-ghome-fast.sh"
