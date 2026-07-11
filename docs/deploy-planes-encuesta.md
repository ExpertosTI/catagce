# Deploy: planes + encuesta

Tras `git pull` en `/opt/QuickCtgo`:

```bash
# 1) Parches SQL (idempotentes)
psql "$DATABASE_URL" -f scripts/schema-patch-plans.sql
psql "$DATABASE_URL" -f scripts/schema-patch-encuesta.sql

# 2) Super admin (no pisa .env; solo añade emails a platform_admins en runtime)
# En el .env del API (o /etc/catagce/*.env) añade, sin borrar secretos:
# SUPER_ADMIN_EMAILS=tu@email.com

# 3) Deploy normal
./deploy.sh update
```

URLs nuevas:
- Encuesta pública: `https://catagce.renace.tech/encuesta`
- Platform admin (mismo login seller, email en SUPER_ADMIN_EMAILS): `/dashboard/platform/plans`
