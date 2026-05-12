/**
 * Development-only seed. Idempotent: re-running won't duplicate rows.
 * Refuses to run when NODE_ENV === 'production' unless SEED_FORCE=1.
 *
 * Usage:
 *   pnpm --filter @catagce/db seed
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from './index';
import { products, sellers, sellerBranding, stockLevels, uoms, warehouses } from './schema';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.SEED_FORCE !== '1') {
  console.error('Refusing to seed a production database. Set SEED_FORCE=1 to override.');
  process.exit(1);
}

const SEED_SLUG = process.env.SEED_SLUG || 'demo';
const SEED_NAME = process.env.SEED_NAME || 'Demo Comercio';
const SEED_EMAIL = process.env.SEED_EMAIL || 'demo@catagce.local';

async function seed() {
  console.log(`Seeding database with demo seller "${SEED_SLUG}"…`);
  const db = createClient(DATABASE_URL!);

  let [seller] = await db.select().from(sellers).where(eq(sellers.slug, SEED_SLUG)).limit(1);
  if (!seller) {
    [seller] = await db
      .insert(sellers)
      .values({
        name: SEED_NAME,
        slug: SEED_SLUG,
        email: SEED_EMAIL,
        role: 'seller',
        status: 'active',
      })
      .returning();
    await db
      .insert(sellerBranding)
      .values({
        sellerId: seller.id,
        primaryColor: '#FACD01',
        accentColor: '#000000',
      })
      .onConflictDoNothing();
    console.log(`Created seller ${seller.id}`);
  } else {
    console.log(`Seller already exists: ${seller.id}`);
  }

  let [unit] = await db
    .select()
    .from(uoms)
    .where(eq(uoms.sellerId, seller.id))
    .limit(1);
  if (!unit) {
    [unit] = await db
      .insert(uoms)
      .values({ sellerId: seller.id, name: 'Unidad', symbol: 'un', conversionFactor: '1.0000' })
      .returning();
  }

  let [warehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.sellerId, seller.id))
    .limit(1);
  if (!warehouse) {
    [warehouse] = await db
      .insert(warehouses)
      .values({ sellerId: seller.id, name: 'Almacén Principal', isDefault: true })
      .returning();
  }

  const existingProducts = await db.select().from(products).where(eq(products.sellerId, seller.id));
  if (existingProducts.length === 0) {
    const [p1] = await db
      .insert(products)
      .values({
        sellerId: seller.id,
        name: 'Producto Ejemplo A',
        description: 'Descripción de ejemplo del producto A.',
        basePrice: '19.99',
        baseUomId: unit.id,
      })
      .returning();
    const [p2] = await db
      .insert(products)
      .values({
        sellerId: seller.id,
        name: 'Producto Ejemplo B',
        description: 'Descripción de ejemplo del producto B.',
        basePrice: '49.50',
        baseUomId: unit.id,
      })
      .returning();
    await db.insert(stockLevels).values([
      { sellerId: seller.id, warehouseId: warehouse.id, productId: p1.id, onHandBase: '100.0000' },
      { sellerId: seller.id, warehouseId: warehouse.id, productId: p2.id, onHandBase: '50.0000' },
    ]);
    console.log('Created 2 example products with stock.');
  }

  console.log('Seed finished.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
