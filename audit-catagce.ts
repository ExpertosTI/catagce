import axios from 'axios';

const API_URL = 'https://api.catagce.renace.tech';
const TEST_SLUG = `rentainer-audit-${Math.floor(Math.random() * 10000)}`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runAudit() {
  console.clear();
  console.log('\x1b[36m%s\x1b[0m', '╔════════════════════════════════════════════════════════════╗');
  console.log('\x1b[36m%s\x1b[0m', '║               CATAGCE RENTAINER AUDIT v2.0                 ║');
  console.log('\x1b[36m%s\x1b[0m', '╚════════════════════════════════════════════════════════════╝\n');

  const steps = [
    { name: 'Conectividad & Health', task: checkHealth },
    { name: 'Aprovisionamiento de Tenant', task: createTenant },
    { name: 'Carga de Inventario Base', task: createProduct },
    { name: 'Publicación de Catálogo', task: createCatalog },
    { name: 'Vinculación de Catálogo', task: linkProduct },
    { name: 'Simulación de Compra E2E', task: simulateOrder },
    { name: 'Verificación de Stock Swarm', task: verifyStock }
  ];

  let context: any = { slug: TEST_SLUG };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const progress = Math.round(((i + 1) / steps.length) * 100);
    process.stdout.write(`\x1b[33m[${progress}%]\x1b[0m 🛠️  ${step.name}... `);

    try {
      await delay(800); // Para que se sienta el latido del sistema
      context = await step.task(context);
      process.stdout.write('\x1b[32mOK ✅\x1b[0m\n');
    } catch (error: any) {
      process.stdout.write('\x1b[31mFALLO ❌\x1b[0m\n');
      console.error(`\n\x1b[41m ERROR EN PASO: ${step.name} \x1b[0m`);
      if (error.response) {
        console.error(`   > Status: ${error.response.status}`);
        console.error(`   > Detalle: ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(`   > Mensaje: ${error.message}`);
      }
      process.exit(1);
    }
  }

  console.log('\n\x1b[32m%s\x1b[0m', '✨ AUDITORÍA FINALIZADA CON ÉXITO ✨');
  console.log('\x1b[36m%s\x1b[0m', `   El sistema es convergente para el tenant: ${TEST_SLUG}\n`);
}

// --- Tareas Individuales ---

async function checkHealth(ctx: any) {
  const res = await axios.get(`${API_URL}/api/health`);
  return { ...ctx, health: res.data };
}

async function createTenant(ctx: any) {
  const res = await axios.post(`${API_URL}/api/sellers`, {
    name: 'Rentainer Audit Corp',
    email: `${ctx.slug}@audit.com`,
    password: 'password123',
    slug: ctx.slug
  });
  return { ...ctx, sellerId: res.data.id };
}

async function createProduct(ctx: any) {
  const res = await axios.post(`${API_URL}/api/products`, {
    name: 'Audit Gear X1',
    sku: 'AUD-X1',
    basePrice: '299.99'
  }, { headers: { 'x-seller-id': ctx.sellerId } });
  return { ...ctx, productId: res.data.id };
}

async function createCatalog(ctx: any) {
  const res = await axios.post(`${API_URL}/api/catalogs`, {
    name: 'Main Audit Catalog',
    slug: `cat-${ctx.slug}`
  }, { headers: { 'x-seller-id': ctx.sellerId } });
  return { ...ctx, catalogId: res.data.id };
}

async function linkProduct(ctx: any) {
  await axios.post(`${API_URL}/api/catalogs/${ctx.catalogId}/products`, {
    productId: ctx.productId
  }, { headers: { 'x-seller-id': ctx.sellerId } });
  return ctx;
}

async function simulateOrder(ctx: any) {
  const res = await axios.post(`${API_URL}/api/public/orders`, {
    catalogSlug: `cat-${ctx.slug}`,
    buyerName: 'Rentainer Ghost',
    buyerPhone: '8095551234',
    items: [{ productId: ctx.productId, quantity: 5 }]
  });
  return { ...ctx, orderId: res.data.id };
}

async function verifyStock(ctx: any) {
  // Esperar un segundo extra para que el worker de DB procese la reserva
  await delay(1000);
  const res = await axios.get(`${API_URL}/api/products`, {
    headers: { 'x-seller-id': ctx.sellerId }
  });
  const p = res.data.find((item: any) => item.id === ctx.productId);
  const reserved = parseFloat(p?.stockLevels?.[0]?.reservedBase || '0');
  if (reserved !== 5) throw new Error(`Stock no reservado correctamente. Esperado: 5, Real: ${reserved}`);
  return ctx;
}

runAudit();
