#!/bin/bash
# Fuerza recreación de servicios GHome con la imagen local más reciente
set -euo pipefail
echo "🔄 Forzando actualización de servicios GHome..."
docker service update --force ghome_admin
docker service update --force ghome_api
docker service update --force ghome_portal
echo "⏳ Esperando 30s..."
sleep 30
docker service ps ghome_admin ghome_api --no-trunc | head -6
echo "✅ Listo — hard refresh en el navegador (Ctrl+Shift+R)"
