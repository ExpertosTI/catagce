const https = require('https');

const API_URL = 'api.catagce.renace.tech';
const TEST_SLUG = `rentainer-audit-${Math.floor(Math.random() * 10000)}`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const parsed = body ? JSON.parse(body) : {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          reject({ response: { status: res.statusCode, data: parsed } });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runAudit() {
  console.clear();
  console.log('\x1b[36m%s\x1b[0m', '╔════════════════════════════════════════════════════════════╗');
  console.log('\x1b[36m%s\x1b[0m', '║               CATAGCE RENTAINER AUDIT v2.2                 ║');
  console.log('\x1b[36m%s\x1b[0m', '║               (AUTH & JWT SECURITY ENABLED)                ║');
  console.log('\x1b[36m%s\x1b[0m', '╚════════════════════════════════════════════════════════════╝\n');

  const steps = [
    { name: 'Conectividad & Health', task: checkHealth },
    { name: 'Registro & Auth JWT', task: registerAndAuth },
    { name: 'Carga de Inventario', task: createProduct },
    { name: 'Publicación Catálogo', task: createCatalog },
    { name: 'Vinculación Items', task: linkProduct },
    { name: 'Compra E2E (Público)', task: simulateOrder },
    { name: 'Verificación de Stock', task: verifyStock }
  ];

  let context = { slug: TEST_SLUG };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const progress = Math.round(((i + 1) / steps.length) * 100);
    process.stdout.write(`\x1b[33m[${progress}%]\x1b[0m 🛠️  ${step.name}... `);

    try {
      await delay(600); 
      context = await step.task(context);
      process.stdout.write('\x1b[32mOK ✅\x1b[0m\n');
    } catch (error) {
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
  console.log('\x1b[36m%s\x1b[0m', `   El sistema es seguro y convergente: ${TEST_SLUG}\n`);
}

async function checkHealth(ctx) {
  const res = await request('GET', '/api/health');
  return { ...ctx, health: res };
}

async function registerAndAuth(ctx) {
  const res = await request('POST', '/api/auth/register', {
    name: 'Rentainer Audit Corp',
    email: `${ctx.slug}@audit.com`,
    password: 'password123',
    slug: ctx.slug
  });
  // La respuesta real contiene { token, seller: { id, ... } }
  if (!res.token) throw new Error('No se recibió JWT tras el registro');
  return { ...ctx, token: res.token, sellerId: res.seller.id };
}

async function createProduct(ctx) {
  const res = await request('POST', '/api/products', {
    name: 'Audit Gear X1',
    sku: 'AUD-X1',
    basePrice: '299.99'
  }, { 
    'Authorization': `Bearer ${ctx.token}`,
    'x-seller-id': ctx.sellerId 
  });
  return { ...ctx, productId: res.id };
}

async function createCatalog(ctx) {
  const res = await request('POST', '/api/catalogs', {
    name: 'Main Audit Catalog',
    slug: `cat-${ctx.slug}`
  }, { 
    'Authorization': `Bearer ${ctx.token}`,
    'x-seller-id': ctx.sellerId 
  });
  return { ...ctx, catalogId: res.id };
}

async function linkProduct(ctx) {
  await request('POST', `/api/catalogs/${ctx.catalogId}/products`, {
    productId: ctx.productId
  }, { 
    'Authorization': `Bearer ${ctx.token}`,
    'x-seller-id': ctx.sellerId 
  });
  return ctx;
}

async function simulateOrder(ctx) {
  // El pedido público NO necesita token
  const res = await request('POST', '/api/public/orders', {
    catalogSlug: `cat-${ctx.slug}`,
    buyerName: 'Rentainer Ghost',
    buyerPhone: '8095551234',
    items: [{ productId: ctx.productId, quantity: 5 }]
  });
  return { ...ctx, orderId: res.id };
}

async function verifyStock(ctx) {
  await delay(1500);
  const res = await request('GET', '/api/products', null, { 
    'Authorization': `Bearer ${ctx.token}`,
    'x-seller-id': ctx.sellerId 
  });
  const p = res.find((item) => item.id === ctx.productId);
  const reserved = parseFloat(p?.stockLevels?.[0]?.reservedBase || '0');
  if (reserved !== 5) throw new Error(`Stock no reservado correctamente. Esperado: 5, Real: ${reserved}`);
  return ctx;
}

runAudit();
