#!/bin/bash
# Fuerza recreación de servicios GHome con la imagen local más reciente
set -euo pipefail
echo "Forzando actualización de servicios GHome..."
docker service update --force ghome_api
docker service update --force ghome_admin
docker service update --force ghome_portal
echo "Esperando 30s..."
sleep 30
echo "--- Estado servicios ---"
docker service ps ghome_api ghome_admin ghome_portal --no-trunc 2>/dev/null | head -9 || true
echo "Listo — hard refresh en el navegador (Ctrl+Shift+R)"
