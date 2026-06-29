#!/bin/bash
# Diagnóstico rápido en servidor Swarm
set -e
echo "═══ Servicios Catagce ═══"
docker service ls | grep catagce || true
echo ""
echo "═══ Tareas fallidas ═══"
docker service ps catagce_api --no-trunc 2>/dev/null | head -5 || true
docker service ps catagce_web --no-trunc 2>/dev/null | head -5 || true
echo ""
echo "═══ Logs API (últimas 30 líneas) ═══"
docker service logs catagce_api --tail 30 2>&1 || true
echo ""
echo "═══ Logs Web (últimas 30 líneas) ═══"
docker service logs catagce_web --tail 30 2>&1 || true
echo ""
echo "═══ Health ═══"
curl -sf https://api.catagce.renace.tech/api/health && echo "" || echo "API: sin respuesta"
curl -sf -o /dev/null -w "Web HTTP %{http_code}\n" https://catagce.renace.tech || true
