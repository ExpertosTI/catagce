import { createClient } from './index';
import { sellers, products, stockLevels, uoms, warehouses } from './schema';
import * as dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://catagce:catagce@localhost:5432/catagce';

async function seed() {
  console.log('🌱 Iniciando Seeding de Catagce...');
  const db = createClient(DATABASE_URL);

  // 1. Crear un Vendedor Demo
  console.log('🏢 Creando vendedor demo...');
  const [demoSeller] = await db.insert(sellers).values({
    name: 'Renace Tech Demo',
    slug: 'renace-demo',
  }).returning();

  // 2. Crear UOMs básicos
  console.log('📏 Creando unidades de medida...');
  const [unitUom] = await db.insert(uoms).values({
    sellerId: demoSeller.id,
    name: 'Unidad',
    symbol: 'un',
    conversionFactor: '1.0000',
  }).returning();

  // 3. Crear Almacén
  console.log('📦 Creando almacén principal...');
  const [mainWarehouse] = await db.insert(warehouses).values({
    sellerId: demoSeller.id,
    name: 'Almacén Central',
    isDefault: true,
  }).returning();

  // 4. Crear Productos
  console.log('👟 Creando productos...');
  const [p1] = await db.insert(products).values({
    sellerId: demoSeller.id,
    name: 'Tenis Urbanos - Teal',
    description: 'Calzado premium para estilo urbano',
    basePrice: '99.99',
    baseUomId: unitUom.id,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop',
  }).returning();

  const [p2] = await db.insert(products).values({
    sellerId: demoSeller.id,
    name: 'Sudadera Premium - Gris',
    description: 'Sudadera de algodón orgánico',
    basePrice: '149.50',
    baseUomId: unitUom.id,
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400&auto=format&fit=crop',
  }).returning();

  // 5. Agregar Stock
  console.log('📊 Agregando niveles de stock...');
  await db.insert(stockLevels).values([
    {
      sellerId: demoSeller.id,
      warehouseId: mainWarehouse.id,
      productId: p1.id,
      onHandBase: '1200.0000',
    },
    {
      sellerId: demoSeller.id,
      warehouseId: mainWarehouse.id,
      productId: p2.id,
      onHandBase: '550.0000',
    }
  ]);

  console.log('✅ Seeding completado exitosamente.');
  console.log(`🚀 Seller ID: ${demoSeller.id}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error durante el seeding:', err);
  process.exit(1);
});
