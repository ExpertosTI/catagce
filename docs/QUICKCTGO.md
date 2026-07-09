# QuickCtgo — CATAGCE (catagce.renace.tech)

Rama `QuickCtgo` del monorepo. Incluye **Difusión WhatsApp** en el panel.

## Deploy en servidor existente (no invasivo)

**No toque su `.env` ni genere secretos nuevos.** El deploy usa lo que ya tiene.

```bash
cd /opt/QuickCtgo
git fetch origin
git checkout QuickCtgo
git pull origin QuickCtgo

# WhatsApp (si aún no lo tiene): .evolution.local en la raíz
# Mismo archivo que otros proyectos Renace — el deploy lo carga sin modificar .env

bash scripts/deploy-quickctgo.sh
bash scripts/quickctgo-db-init.sh          # solo schema (predeterminado)
# bash scripts/quickctgo-db-init.sh all    # schema + seed solo si DB vacía
```

### Primera instalación (sin .env previo)

```bash
cp .env.quickctgo.example .env
nano .env   # complete DB_PASSWORD, JWT_SECRET
```

## URLs

- Panel: https://catagce.renace.tech/login
- Difusión: https://catagce.renace.tech/dashboard/broadcast

## Qué hace cada script

| Script | Comportamiento |
|--------|----------------|
| `deploy-quickctgo.sh` | Build + stack deploy; **no crea .env**; añade solo claves URL que falten |
| `quickctgo-db-init.sh` | Por defecto `push` — tablas nuevas, **no borra datos** |
| `quickctgo-env.sh` | Carga `.env` + `.evolution.local` sin sobrescribir valores existentes |
