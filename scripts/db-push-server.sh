#!/bin/bash
# Aplica el schema completo de Drizzle en producción (Docker Swarm)
set -e
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce
exec bash scripts/reset-and-seed-server.sh push
