# Update producción Catagce (QuickCtgo)

Flujo canónico — **un solo comando**. No inventar `psql` del host ni regenerar `.env`.

```bash
cd /opt/QuickCtgo
bash scripts/deploy-update.sh
```

Ese script ya hace: `git fetch` + `reset --hard origin/main`, build api/web, stack deploy, force por servicio, y parches SQL idempotentes (`schema-patch-plans`, `encuesta`, `plan-requests`) vía `scripts/schema-patch.sh`.

Si hace falta solo un parche SQL (sin rebuild):

```bash
bash scripts/schema-patch.sh scripts/<parche>.sql
```

**SUPER_ADMIN_EMAILS / PLATFORM_NOTIFY_PHONES:** upsert en el `.env` existente (solo claves vacías). No pisar secretos.
