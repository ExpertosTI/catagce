import { createClient } from './index';
import {
  sellers, sellerUsers, sellerApiKeys, sellerBranding, sellerSettings,
  products, productVariants, productBarcodes, stockLevels, stockMovements,
  uoms, warehouses, catalogs, catalogProducts, catalogPublications,
  catalogTemplates, priceLists, priceListItems, webhooks, buyerContacts,
} from './schema';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://catagce:catagce@localhost:5432/catagce';
const DEMO_API_KEY = 'cat_demo_renace_2026';
const DEMO_PASSWORD = 'demo1234';

async function seed() {
  console.log('🌱 Iniciando Seeding completo de Catagce...');
  const db = createClient(DATABASE_URL);

  // ─── Seller & Identity ───────────────────────────────────────────────────
  console.log('🏢 Creando vendedor demo...');
  const [demoSeller] = await db.insert(sellers).values({
    name: 'Renace Tech Demo',
    slug: 'renace-demo',
    email: 'demo@renace.tech',
    phone: '+18095551234',
  }).returning();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const [demoUser] = await db.insert(sellerUsers).values({
    sellerId: demoSeller.id,
    email: 'demo@renace.tech',
    passwordHash,
    name: 'Admin Demo',
    role: 'owner',
  }).returning();

  await db.insert(sellerApiKeys).values({ sellerId: demoSeller.id, key: DEMO_API_KEY, name: 'Demo Key' });
  await db.insert(sellerBranding).values({
    sellerId: demoSeller.id,
    primaryColor: '#00D1FF',
    accentColor: '#FF8A00',
    welcomeMessage: 'Bienvenido a nuestro catálogo B2B. Realiza tu pedido en minutos.',
  });
  await db.insert(sellerSettings).values({
    sellerId: demoSeller.id,
    currency: 'USD',
    whatsappNumber: '+18095551234',
    lowStockThreshold: '50',
  });

  // ─── UOMs ────────────────────────────────────────────────────────────────
  console.log('📏 Creando unidades de medida...');
  const [unitUom] = await db.insert(uoms).values({
    sellerId: demoSeller.id, name: 'Unidad', symbol: 'un', conversionFactor: '1.0000',
  }).returning();
  const [dozenUom] = await db.insert(uoms).values({
    sellerId: demoSeller.id, name: 'Docena', symbol: 'dz', baseUomId: unitUom.id, conversionFactor: '12.0000',
  }).returning();
  await db.insert(uoms).values({
    sellerId: demoSeller.id, name: 'Caja (12 docenas)', symbol: 'bx', baseUomId: unitUom.id, conversionFactor: '144.0000',
  });

  // ─── Warehouse ─────────────────────────────────────────────────────────────
  console.log('📦 Creando almacén...');
  const [mainWarehouse] = await db.insert(warehouses).values({
    sellerId: demoSeller.id, name: 'Almacén Central', address: 'Santo Domingo, RD', isDefault: true,
  }).returning();

  // ─── Price List ────────────────────────────────────────────────────────────
  const [priceList] = await db.insert(priceLists).values({
    sellerId: demoSeller.id, name: 'Lista Mayorista 2026', isDefault: true,
  }).returning();

  // ─── Catalog Template ──────────────────────────────────────────────────────
  await db.insert(catalogTemplates).values({ name: 'Grid Moderno', layout: 'grid', isSystem: true });

  // ─── Products ──────────────────────────────────────────────────────────────
  console.log('👟 Creando productos...');
  const productData = [
    { name: 'Tenis Urbanos - Teal', sku: 'TEN-001', category: 'Calzado', basePrice: '99.99', b2bPrice: '89.99',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400', stock: '1200' },
    { name: 'Sudadera Premium - Gris', sku: 'SUD-001', category: 'Ropa', basePrice: '149.50', b2bPrice: '129.00',
      imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400', stock: '550' },
    { name: 'Gorra Snapback - Negro', sku: 'GOR-001', category: 'Accesorios', basePrice: '35.00', b2bPrice: '28.00',
      imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=400', stock: '800' },
    { name: 'Mochila Urban Pro', sku: 'MOC-001', category: 'Accesorios', basePrice: '79.99', b2bPrice: '69.99',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=400', stock: '320' },
    { name: 'Polo Básico - Blanco', sku: 'POL-001', category: 'Ropa', basePrice: '45.00', b2bPrice: '38.00',
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400', stock: '2000' },
    { name: 'Jean Slim Fit - Azul', sku: 'JEA-001', category: 'Ropa', basePrice: '89.00', b2bPrice: '75.00',
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=400', stock: '450' },
  ];

  const createdProducts = [];
  for (const p of productData) {
    const [product] = await db.insert(products).values({
      sellerId: demoSeller.id, name: p.name, sku: p.sku, category: p.category,
      basePrice: p.basePrice, b2bPrice: p.b2bPrice, baseUomId: unitUom.id, imageUrl: p.imageUrl,
      views: Math.floor(Math.random() * 200) + 10,
    }).returning();

    await db.insert(stockLevels).values({
      sellerId: demoSeller.id, warehouseId: mainWarehouse.id, productId: product.id,
      onHandBase: `${p.stock}.0000`, minimumThresholdBase: '50.0000',
    });

    await db.insert(stockMovements).values({
      sellerId: demoSeller.id, warehouseId: mainWarehouse.id, productId: product.id,
      movementType: 'inbound', quantityBaseDelta: `${p.stock}.0000`,
      reasonCode: 'initial_stock', actorUserId: demoUser.id,
    });

    await db.insert(priceListItems).values({
      priceListId: priceList.id, productId: product.id, price: p.b2bPrice,
    });

    await db.insert(productBarcodes).values({
      productId: product.id, barcode: `750${Math.random().toString().slice(2, 11)}`, type: 'ean13',
    });

    createdProducts.push(product);
  }

  // Variant for first product
  await db.insert(productVariants).values({
    productId: createdProducts[0].id, name: 'Talla 42', sku: 'TEN-001-42', priceAdjustment: '0',
  });

  // ─── Catalog ───────────────────────────────────────────────────────────────
  console.log('📚 Creando catálogo...');
  const [catalog] = await db.insert(catalogs).values({
    sellerId: demoSeller.id, name: 'Catálogo Mayorista 2026', slug: 'mayorista-2026',
    description: 'Selección premium para distribuidores',
  }).returning();

  await db.insert(catalogProducts).values(
    createdProducts.map((p, i) => ({ catalogId: catalog.id, productId: p.id, sortOrder: i })),
  );

  const [publication] = await db.insert(catalogPublications).values({
    catalogId: catalog.id, token: 'cat_demo_share_token_2026',
  }).returning();

  // ─── Buyer contacts ────────────────────────────────────────────────────────
  await db.insert(buyerContacts).values([
    { sellerId: demoSeller.id, name: 'Juan Pérez', phone: '+18095550001', orderCount: 5, totalSpent: '2500.00' },
    { sellerId: demoSeller.id, name: 'María García', phone: '+18095550002', orderCount: 3, totalSpent: '1800.00' },
  ]);

  // ─── Webhook ───────────────────────────────────────────────────────────────
  await db.insert(webhooks).values({
    sellerId: demoSeller.id, url: 'https://webhook.site/demo-catagce',
    secret: 'whsec_demo_secret',
    events: ['order.created', 'catalog.published', 'integration.synced', 'product.created'],
  });

  console.log('\n✅ Seeding completado exitosamente.\n');
  console.log('═══════════════════════════════════════');
  console.log(`🚀 Seller ID:    ${demoSeller.id}`);
  console.log(`🔑 API Key:      ${DEMO_API_KEY}`);
  console.log(`📧 Email:        demo@renace.tech`);
  console.log(`🔒 Password:     ${DEMO_PASSWORD}`);
  console.log(`📎 Share Token:  ${publication.token}`);
  console.log(`🌐 Catálogo:     /catalog/mayorista-2026`);
  console.log(`🛒 Pedido:       /order/${publication.token}`);
  console.log('═══════════════════════════════════════\n');
  process.exit(0);
}

seed().catch((err) => { console.error('❌ Error:', err); process.exit(1); });
