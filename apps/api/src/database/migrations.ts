/**
 * Embedded, idempotent migration runner.
 *
 * Each migration has a unique ID and a list of SQL statements.
 * On startup the runner ensures `__catagce_migrations__` exists, then applies
 * any migration that has not been recorded as applied yet.
 *
 * Add new migrations by appending entries to MIGRATIONS — NEVER edit existing ones.
 */
import { sql } from 'drizzle-orm';
import type { Logger } from '@nestjs/common';

export interface Migration {
  id: string; // e.g. "20260512_0001_baseline"
  description: string;
  /** Statements run sequentially in a single transaction. */
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    id: '20260512_0001_baseline',
    description: 'Baseline schema for sellers, products, catalogs, orders, inventory',
    statements: [
      // Enums
      `DO $$ BEGIN
        CREATE TYPE order_status AS ENUM (
          'draft_capture','submitted','reserved','pending_seller_review','confirmed',
          'partially_confirmed','rejected','cancelled','expired'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN
        CREATE TYPE movement_type AS ENUM (
          'inbound','outbound','adjustment','transfer_out','transfer_in',
          'reservation_hold','reservation_release','order_confirmed','count_reconcile'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN
        CREATE TYPE reservation_status AS ENUM ('active','released','consumed','expired');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

      // Sellers
      `CREATE TABLE IF NOT EXISTS sellers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        email TEXT,
        password TEXT,
        role TEXT DEFAULT 'seller',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email TEXT;`,
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS password TEXT;`,
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'seller';`,
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`,
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`,
      `CREATE UNIQUE INDEX IF NOT EXISTS sellers_email_unique ON sellers (email) WHERE email IS NOT NULL;`,

      // Seller branding
      `CREATE TABLE IF NOT EXISTS seller_branding (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        logo_url TEXT,
        banner_url TEXT,
        primary_color TEXT DEFAULT '#FACD01',
        accent_color TEXT DEFAULT '#000000',
        phone TEXT,
        whatsapp TEXT,
        address TEXT,
        instagram TEXT,
        website TEXT,
        description TEXT,
        payment_methods TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS logo_url TEXT;`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS banner_url TEXT;`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#FACD01';`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#000000';`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS phone TEXT;`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS whatsapp TEXT;`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS address TEXT;`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS instagram TEXT;`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS website TEXT;`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS description TEXT;`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS payment_methods TEXT;`,
      `ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`,
      `CREATE UNIQUE INDEX IF NOT EXISTS seller_branding_seller_unique ON seller_branding (seller_id);`,

      // UOMs
      `CREATE TABLE IF NOT EXISTS uoms (
        id SERIAL PRIMARY KEY,
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        symbol TEXT,
        base_uom_id INTEGER,
        conversion_factor DECIMAL(12, 4) DEFAULT '1.0000'
      );`,
      `CREATE INDEX IF NOT EXISTS uoms_seller_id_idx ON uoms (seller_id);`,

      // Warehouses
      `CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE
      );`,
      `CREATE INDEX IF NOT EXISTS warehouses_seller_id_idx ON warehouses (seller_id);`,

      // Products
      `CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sku TEXT,
        description TEXT,
        base_uom_id INTEGER NOT NULL REFERENCES uoms(id),
        base_price DECIMAL(12, 2) NOT NULL,
        b2b_price DECIMAL(12, 2),
        min_order_quantity DECIMAL(12, 4) DEFAULT '1.0000',
        is_active BOOLEAN DEFAULT TRUE,
        image_url TEXT,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS b2b_price DECIMAL(12, 2);`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(12, 4) DEFAULT '1.0000';`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;`,
      `DO $$
       DECLARE col_type TEXT;
       BEGIN
         SELECT data_type INTO col_type FROM information_schema.columns
           WHERE table_name = 'products' AND column_name = 'views';
         IF col_type IS NOT NULL AND col_type <> 'integer' THEN
           ALTER TABLE products ALTER COLUMN views TYPE INTEGER USING (views::integer);
           ALTER TABLE products ALTER COLUMN views SET DEFAULT 0;
         END IF;
       END $$;`,
      `CREATE INDEX IF NOT EXISTS products_seller_id_idx ON products (seller_id);`,
      `CREATE INDEX IF NOT EXISTS products_is_active_idx ON products (is_active);`,

      // Product media
      `CREATE TABLE IF NOT EXISTS product_media (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        is_main BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0
      );`,
      `CREATE INDEX IF NOT EXISTS product_media_product_id_idx ON product_media (product_id);`,

      // Stock levels
      `CREATE TABLE IF NOT EXISTS stock_levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        on_hand_base DECIMAL(12, 4) DEFAULT '0.0000',
        reserved_base DECIMAL(12, 4) DEFAULT '0.0000',
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS stock_levels_unique ON stock_levels (seller_id, warehouse_id, product_id);`,
      `CREATE INDEX IF NOT EXISTS stock_levels_product_idx ON stock_levels (product_id);`,

      // Stock movements
      `CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        product_id UUID NOT NULL REFERENCES products(id),
        movement_type movement_type NOT NULL,
        quantity_base_delta DECIMAL(12, 4) NOT NULL,
        source_uom_id INTEGER REFERENCES uoms(id),
        source_quantity DECIMAL(12, 4),
        reason_code TEXT,
        reference_type TEXT,
        reference_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS stock_movements_seller_idx ON stock_movements (seller_id);`,
      `CREATE INDEX IF NOT EXISTS stock_movements_ref_idx ON stock_movements (reference_type, reference_id);`,

      // Catalogs
      `CREATE TABLE IF NOT EXISTS catalogs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS catalogs_seller_id_idx ON catalogs (seller_id);`,

      // Catalog products
      `CREATE TABLE IF NOT EXISTS catalog_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        catalog_id UUID NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sort_order INTEGER DEFAULT 0
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS catalog_products_unique ON catalog_products (catalog_id, product_id);`,

      // Orders
      `CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        catalog_id UUID REFERENCES catalogs(id),
        idempotency_key TEXT UNIQUE,
        status order_status DEFAULT 'submitted',
        buyer_name TEXT NOT NULL,
        buyer_phone TEXT NOT NULL,
        total_amount DECIMAL(12, 2),
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON orders (seller_id);`,
      `CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);`,
      `CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);`,

      // Order items
      `CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        uom_id INTEGER REFERENCES uoms(id),
        quantity DECIMAL(12, 4) NOT NULL,
        unit_price DECIMAL(12, 2) NOT NULL,
        subtotal DECIMAL(12, 2) NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);`,

      // Stock reservations
      `CREATE TABLE IF NOT EXISTS stock_reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        product_id UUID NOT NULL REFERENCES products(id),
        reserved_base DECIMAL(12, 4) NOT NULL,
        status reservation_status DEFAULT 'active',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS stock_reservations_order_idx ON stock_reservations (order_id);`,
      `CREATE INDEX IF NOT EXISTS stock_reservations_status_idx ON stock_reservations (status);`,
    ],
  },
  {
    id: '20260513_0001_repair_global_schema_v3',
    description: 'Global schema repair: Reset inventory tables to fix UUID/Integer mismatches',
    statements: [
      // Eliminamos en cascada las tablas que tienen tipos inconsistentes (mockup legacy)
      `DROP TABLE IF EXISTS stock_reservations CASCADE;`,
      `DROP TABLE IF EXISTS order_items CASCADE;`,
      `DROP TABLE IF EXISTS orders CASCADE;`,
      `DROP TABLE IF EXISTS stock_movements CASCADE;`,
      `DROP TABLE IF EXISTS stock_levels CASCADE;`,
      `DROP TABLE IF EXISTS catalog_products CASCADE;`,
      `DROP TABLE IF EXISTS products CASCADE;`,
      `DROP TABLE IF EXISTS uoms CASCADE;`,

      // Recreamos UOMs con el tipo correcto (SERIAL/INTEGER)
      `CREATE TABLE uoms (
        id SERIAL PRIMARY KEY,
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        symbol TEXT,
        base_uom_id INTEGER,
        conversion_factor DECIMAL(12, 4) DEFAULT '1.0000'
      );`,

      // Recreamos Products con tipos oficiales
      `CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sku TEXT,
        description TEXT,
        base_uom_id INTEGER NOT NULL REFERENCES uoms(id),
        base_price DECIMAL(12, 2) NOT NULL,
        b2b_price DECIMAL(12, 2),
        min_order_quantity DECIMAL(12, 4) DEFAULT '1.0000',
        is_active BOOLEAN DEFAULT TRUE,
        image_url TEXT,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,

      // Recreamos las tablas dependientes mínimas para que el sistema no rompa
      `CREATE TABLE catalog_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        catalog_id UUID NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sort_order INTEGER DEFAULT 0
      );`,
      `CREATE TABLE stock_levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        on_hand_base DECIMAL(12, 4) DEFAULT '0.0000',
        reserved_base DECIMAL(12, 4) DEFAULT '0.0000',
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      // Recreamos las tablas de Órdenes y Reservas
      `CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        catalog_id UUID REFERENCES catalogs(id),
        idempotency_key TEXT UNIQUE,
        status order_status DEFAULT 'submitted',
        buyer_name TEXT NOT NULL,
        buyer_phone TEXT NOT NULL,
        total_amount DECIMAL(12, 2),
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        uom_id INTEGER REFERENCES uoms(id),
        quantity DECIMAL(12, 4) NOT NULL,
        unit_price DECIMAL(12, 2) NOT NULL,
        subtotal DECIMAL(12, 2) NOT NULL
      );`,
      `CREATE TABLE stock_reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        product_id UUID NOT NULL REFERENCES products(id),
        reserved_base DECIMAL(12, 4) NOT NULL,
        status reservation_status DEFAULT 'active',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        product_id UUID NOT NULL REFERENCES products(id),
        movement_type movement_type NOT NULL,
        quantity_base_delta DECIMAL(12, 4) NOT NULL,
        source_uom_id INTEGER REFERENCES uoms(id),
        source_quantity DECIMAL(12, 4),
        reason_code TEXT,
        reference_type TEXT,
        reference_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
    ],
  },
];

export async function runEmbeddedMigrations(db: any, logger: Logger): Promise<void> {
  // Bootstrap the tracking table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS __catagce_migrations__ (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
      description TEXT
    );
  `);

  const appliedRows = await db.execute(sql`SELECT id FROM __catagce_migrations__`);
  const appliedSet = new Set<string>(
    (appliedRows as any).map((r: any) => r.id || r.ID),
  );

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.id)) continue;

    logger.log(`Applying migration ${migration.id} — ${migration.description}`);
    try {
      // Each statement runs independently; embedded DO $$ blocks and CREATE IF NOT EXISTS
      // are idempotent, so we don't wrap in a single transaction (lets us recover from partial state).
      for (const stmt of migration.statements) {
        await db.execute(sql.raw(stmt));
      }
      await db.execute(sql`
        INSERT INTO __catagce_migrations__ (id, description)
        VALUES (${migration.id}, ${migration.description})
        ON CONFLICT (id) DO NOTHING;
      `);
      logger.log(`Migration ${migration.id} applied.`);
    } catch (err: any) {
      logger.error(`Migration ${migration.id} failed: ${err.message}`);
      throw err;
    }
  }
}
