#!/bin/bash
# Solo diagnóstico — no despliega. Ejecutar en el servidor.
echo "=== BUSCAR CATAGCE EN EL SERVIDOR ==="
echo ""
echo "1. Carpetas en /opt:"
ls -la /opt/ | grep -iE "catagce|quick|ctgo" || echo "  (no encontrado por nombre)"
echo ""
echo "2. docker-compose con catagce:"
find /opt -name "docker-compose.yml" -exec grep -l "catagce" {} \; 2>/dev/null
echo ""
echo "3. Docker stacks:"
docker stack ls 2>/dev/null
echo ""
echo "4. Servicios catagce:"
docker service ls 2>/dev/null | grep -i catagce
echo ""
echo "5. Contenedores catagce/quick:"
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -iE "catagce|quick|ctgo" || echo "  ninguno"
echo ""
echo "6. Imágenes:"
docker images | grep -iE "catagce|quick" || echo "  ninguna"
echo ""
echo "7. Red RenaceNet:"
docker network ls | grep -i renace
echo ""
echo "=== Si el proyecto está en /opt/QuickCtgo, es Catagce (nombre legacy) ==="
