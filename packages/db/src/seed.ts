import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { createClientFromEnv } from './index';
import {
  companies, staffUsers, warehouses, priceLists, clients, productCategories,
  products, productMedia, importShipments, importItems, stockLevels, catalogs, catalogProducts,
  invoices, invoiceItems, clientAllocations, dispatches, dispatchItems, invoicePayments,
  fiscalSequences,
} from './schema';

async function seed() {
  const db = createClientFromEnv();
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@generalhome.tech';
  const isProd = process.env.NODE_ENV === 'production';
  let adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword) {
    if (isProd) {
      throw new Error('ADMIN_PASSWORD es obligatorio en producción. Ejecute: bash scripts/ghome-ensure-secrets.sh');
    }
    adminPassword = `Dev-${Math.random().toString(36).slice(2, 10)}!9x`;
    console.warn(`[dev] ADMIN_PASSWORD no definido — temporal: ${adminPassword}`);
  }
  if (isProd && (adminPassword === 'demo1234' || adminPassword.length < 12)) {
    throw new Error('ADMIN_PASSWORD debe ser una contraseña fuerte (mín. 12 caracteres) en producción');
  }

  console.log('🌱 Seeding GHome demo data...');

  const [company] = await db.insert(companies).values({
    name: 'GHome Importaciones',
    slug: 'generalhome',
    taxId: '123456789',
    email: 'admin@generalhome.tech',
    phone: '+507 6000-0000',
    address: 'Ciudad de Panamá, Zona Libre de Colón',
    logoUrl: 'https://picsum.photos/seed/ghome-logo/200/200',
  }).returning();

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const [admin] = await db.insert(staffUsers).values({
    companyId: company.id,
    email: adminEmail,
    passwordHash,
    name: 'Administrador GHome',
    role: 'owner',
  }).returning();

  const [warehouse] = await db.insert(warehouses).values({
    companyId: company.id,
    name: 'Almacén Principal',
    location: 'Zona Libre de Colón',
    isDefault: true,
  }).returning();

  await db.insert(priceLists).values({
    companyId: company.id,
    name: 'Lista General',
    isDefault: true,
  });

  const [client] = await db.insert(clients).values({
    companyId: company.id,
    code: 'CLI-001',
    name: 'Distribuidora El Progreso',
    email: 'cliente@demo.com',
    passwordHash,
    phone: '+507 6111-1111',
    taxId: '987654321',
    address: 'David, Chiriquí',
    creditLimit: '50000.00',
    creditDays: 30,
    status: 'active',
  }).returning();

  const [catElectro] = await db.insert(productCategories).values({
    companyId: company.id,
    name: 'Electrodomésticos',
    slug: 'electrodomesticos',
  }).returning();

  const demoProducts = [
    { sku: 'GH-LAV-001', name: 'Lavadora 18kg Inverter', salePrice: '459.00', costPrice: '320.00' },
    { sku: 'GH-REF-002', name: 'Refrigerador Side by Side', salePrice: '899.00', costPrice: '650.00' },
    { sku: 'GH-MIC-003', name: 'Microondas Digital 1.1 cu ft', salePrice: '89.00', costPrice: '55.00' },
    { sku: 'GH-AIR-004', name: 'Aire Acondicionado Split 12000 BTU', salePrice: '349.00', costPrice: '240.00' },
    { sku: 'GH-TV-005', name: 'Smart TV 55" 4K UHD', salePrice: '429.00', costPrice: '310.00' },
  ];

  const insertedProducts = [];
  for (const p of demoProducts) {
    const [prod] = await db.insert(products).values({
      companyId: company.id,
      categoryId: catElectro.id,
      sku: p.sku,
      name: p.name,
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      unit: 'un',
    }).returning();
    insertedProducts.push(prod);

    await db.insert(productMedia).values({
      productId: prod.id,
      url: `https://picsum.photos/seed/${p.sku}/600/600`,
      isPrimary: true,
      sortOrder: 0,
    });

    await db.insert(stockLevels).values({
      companyId: company.id,
      productId: prod.id,
      warehouseId: warehouse.id,
      totalQty: 100,
      reservedQty: 0,
      dispatchedQty: 0,
    });
  }

  const [shipment] = await db.insert(importShipments).values({
    companyId: company.id,
    reference: 'IMP-2026-001',
    containerNumber: 'MSCU1234567',
    status: 'received',
    receivedAt: new Date(),
    notes: 'Contenedor de electrodomésticos - China',
  }).returning();

  for (const prod of insertedProducts) {
    await db.insert(importItems).values({
      shipmentId: shipment.id,
      productId: prod.id,
      quantity: 100,
      warehouseId: warehouse.id,
    });
  }

  const [catalog] = await db.insert(catalogs).values({
    companyId: company.id,
    name: 'Preventa Marzo 2026',
    slug: 'preventa-marzo-2026',
    description: 'Catálogo de preventa - mercancía en tránsito',
    isPresale: true,
    isPublic: true,
    coverImageUrl: 'https://picsum.photos/seed/ghome-catalog/1200/400',
  }).returning();

  for (let i = 0; i < insertedProducts.length; i++) {
    await db.insert(catalogProducts).values({
      catalogId: catalog.id,
      productId: insertedProducts[i].id,
      displayPrice: demoProducts[i].salePrice,
      sortOrder: i,
    });
  }

  // Secuencias NCF demo (DGII)
  for (const type of ['B01', 'B02', 'B03', 'B04'] as const) {
    await db.insert(fiscalSequences).values({
      companyId: company.id,
      comprobanteType: type,
      rangeFrom: 1,
      rangeTo: 99999,
      currentNumber: type === 'B01' ? 2 : 1,
      authorizedUntil: new Date(Date.now() + 365 * 86400000),
      isActive: true,
    });
  }

  // Demo factura a crédito con despacho parcial
  const [invoice] = await db.insert(invoices).values({
    companyId: company.id,
    clientId: client.id,
    reference: 'FAC-DEMO-001',
    ncf: 'B0100000001',
    comprobanteType: 'B01',
    invoiceType: 'credit',
    status: 'partially_paid',
    subtotal: '1142.37',
    taxAmount: '205.63',
    itbisRate: '18.00',
    totalAmount: '1348.00',
    paidAmount: '500.00',
    dueDate: new Date(Date.now() + 30 * 86400000),
    issuedAt: new Date(Date.now() - 7 * 86400000),
    createdById: admin.id,
    notes: 'Factura demo - electrodomésticos',
  }).returning();

  const invoiceLines = [
    { product: insertedProducts[0], qty: 2, price: '459.00' },
    { product: insertedProducts[3], qty: 1, price: '349.00' },
    { product: insertedProducts[2], qty: 1, price: '89.00' },
  ];

  const invItems = [];
  for (const line of invoiceLines) {
    const lineTotal = (parseFloat(line.price) * line.qty).toFixed(2);
    const [invItem] = await db.insert(invoiceItems).values({
      invoiceId: invoice.id,
      productId: line.product.id,
      quantity: line.qty,
      unitPrice: line.price,
      lineTotal,
      dispatchedQty: line.qty === 2 ? 1 : 0,
      warehouseId: warehouse.id,
    }).returning();
    invItems.push({ ...invItem, pending: line.qty === 2 ? 1 : line.qty });

    await db.insert(clientAllocations).values({
      companyId: company.id,
      clientId: client.id,
      invoiceItemId: invItem.id,
      productId: line.product.id,
      allocatedQty: line.qty,
      dispatchedQty: line.qty === 2 ? 1 : 0,
      pendingQty: line.qty === 2 ? 1 : line.qty,
      status: line.qty === 2 ? 'partially_dispatched' : 'reserved',
      warehouseId: warehouse.id,
    });

    await db.update(stockLevels).set({
      reservedQty: line.qty,
      dispatchedQty: line.qty === 2 ? 1 : 0,
    }).where(eq(stockLevels.productId, line.product.id));
  }

  await db.insert(invoicePayments).values({
    invoiceId: invoice.id,
    amount: '500.00',
    method: 'transfer',
    reference: 'TRF-001',
    recordedById: admin.id,
  });

  const [dispatch] = await db.insert(dispatches).values({
    companyId: company.id,
    clientId: client.id,
    invoiceId: invoice.id,
    reference: 'DES-DEMO-001',
    status: 'completed',
    dispatchedAt: new Date(Date.now() - 3 * 86400000),
    notes: 'Primer despacho parcial - 1 lavadora',
    createdById: admin.id,
  }).returning();

  await db.insert(dispatchItems).values({
    dispatchId: dispatch.id,
    invoiceItemId: invItems[0].id,
    productId: insertedProducts[0].id,
    quantity: 1,
    warehouseId: warehouse.id,
  });

  console.log('✅ GHome seed complete');
  console.log('');
  if (isProd) {
    console.log(`  Admin panel:    ${adminEmail} (contraseña definida en ADMIN_PASSWORD)`);
  } else {
    console.log(`  Admin panel:    ${adminEmail} / ${adminPassword}`);
  }
  console.log('  Portal:         https://generalhome.tech');
  console.log('  Admin:          https://admin.generalhome.tech');
  console.log('  API:            https://api.generalhome.tech/api');
  console.log(`  Factura demo:   ${invoice.reference} (crédito, despacho parcial)`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
