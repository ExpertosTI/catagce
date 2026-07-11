# Update: planes + encuesta (QuickCtgo existente)

Flujo canónico en `/opt/QuickCtgo` — **no** usar `psql` del host ni inventar `.env`.

```bash
cd /opt/QuickCtgo
git fetch --all && git reset --hard origin/main

# Migraciones separadas del build (idempotentes, vía contenedor DB)
bash scripts/schema-patch.sh scripts/schema-patch-plans.sql
bash scripts/schema-patch.sh scripts/schema-patch-encuesta.sql

# Deploy de código (api + web)
bash scripts/deploy-update.sh
```

Si `deploy.sh` da Permission denied: usar `bash scripts/deploy-update.sh` (es el update de producción).

**SUPER_ADMIN_EMAILS:** upsert en el `.env` ya existente del API (solo rellenar si está vacío), con el email de la cuenta seller que ya usas para entrar. El API lo lee en runtime y registra `platform_admins` sin pisar secretos.

Tras el update:
- Encuesta: `/encuesta`
- Platform: `/dashboard/platform/plans` (mismo login; email en `SUPER_ADMIN_EMAILS` o en `platform_admins`)
