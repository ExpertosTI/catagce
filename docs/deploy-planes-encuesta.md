# Update producción Catagce (QuickCtgo)

```bash
cd /opt/QuickCtgo
bash scripts/deploy-update.sh
```

Si `catagce_api` hace rollback:

```bash
bash scripts/debug-api.sh
bash scripts/recover-api.sh
```

Disco bajo (~90%):

```bash
docker container prune -f && docker image prune -a -f && docker builder prune -af
bash scripts/deploy-update.sh
```

Solo parche SQL (sin rebuild):

```bash
bash scripts/schema-patch.sh scripts/<parche>.sql
```

**SUPER_ADMIN_EMAILS / PLATFORM_NOTIFY_PHONES:** upsert en el `.env` existente (solo claves vacías).
