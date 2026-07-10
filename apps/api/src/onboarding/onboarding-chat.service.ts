import { Injectable, Inject } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { eq } from 'drizzle-orm';
import { sellerBranding, sellerSettings, sellers } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { AiToolsService } from '../ai/ai-tools.service';

export type OnboardingSetup = {
  businessName?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  logoSkipped?: boolean;
  whatsappNumber?: string;
  productName?: string;
  productPrice?: number;
  productImageUrl?: string;
  productImageSkipped?: boolean;
  catalogName?: string;
  catalogSlug?: string;
};

export type OnboardingPhase =
  | 'brand'
  | 'logo'
  | 'product'
  | 'product_photo'
  | 'catalog'
  | 'done';

export type AskUpload = 'logo' | 'product' | null;

export type OnboardingChatResponse = {
  reply: string;
  setup?: OnboardingSetup;
  readyToApply: boolean;
  phase: OnboardingPhase;
  suggestions: string[];
  askUpload?: AskUpload;
};

const PHASE_ORDER: OnboardingPhase[] = [
  'brand', 'logo', 'product', 'product_photo', 'catalog', 'done',
];

const PROMPT = `Eres el asistente de configuración de Catagce (catálogos y pedidos por WhatsApp en RD).

REGLAS ESTRICTAS:
1. Español, cálido, breve (1-3 oraciones).
2. NO repitas preguntas ya respondidas. Usa el setup acumulado.
3. Nunca retrocedas de fase.
4. Extrae datos del mensaje en setup (solo campos nuevos).
5. SOLO JSON válido:
{"reply":"...","setup":{...},"phase":"...","readyToApply":false,"suggestions":["..."],"askUpload":null}

Fases en orden: brand → logo → product → product_photo → catalog → done
- brand: nombre + colores
- logo: pedir logo (askUpload:"logo")
- product: nombre + precio
- product_photo: pedir foto (askUpload:"product")
- catalog: nombre + slug
- done: listo

Campos: businessName, primaryColor, accentColor, logoUrl, productName, productPrice,
productImageUrl, catalogName, catalogSlug, whatsappNumber, logoSkipped, productImageSkipped.`;

function phaseIndex(p: string): number {
  const i = PHASE_ORDER.indexOf(p as OnboardingPhase);
  return i >= 0 ? i : 0;
}

function maxPhase(a: OnboardingPhase, b: OnboardingPhase): OnboardingPhase {
  return phaseIndex(a) >= phaseIndex(b) ? a : b;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'catalogo';
}

function hasLogo(setup: OnboardingSetup) {
  return Boolean(setup.logoUrl) || Boolean(setup.logoSkipped);
}

function hasProductImage(setup: OnboardingSetup) {
  return Boolean(setup.productImageUrl) || Boolean(setup.productImageSkipped);
}

function inferPhase(setup: OnboardingSetup): OnboardingPhase {
  if (
    setup.catalogName && setup.catalogSlug
    && setup.productName && setup.productPrice
    && hasProductImage(setup) && hasLogo(setup)
  ) return 'done';

  if (setup.productName && setup.productPrice && hasProductImage(setup) && hasLogo(setup)) {
    return 'catalog';
  }
  if (setup.productName && setup.productPrice && hasLogo(setup)) {
    return 'product_photo';
  }
  if (hasLogo(setup) && (setup.businessName || setup.primaryColor)) {
    return 'product';
  }
  if (setup.businessName || setup.primaryColor) {
    return 'logo';
  }
  return 'brand';
}

function isSkip(message: string) {
  return /omitir|saltar|después|despues|sin\s+(logo|foto|imagen)|no\s+tengo|más\s+tarde|mas\s+tarde|skip/i.test(message);
}

function extractFromMessage(message: string, phase: OnboardingPhase): OnboardingSetup {
  const setup: OnboardingSetup = {};
  const lower = message.toLowerCase().trim();

  // Uploaded image URL pasted or sent by client
  const urlMatch = message.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)(?:\?\S*)?/i)
    || message.match(/https?:\/\/\S*\/uploads\/\S+/i);
  if (urlMatch) {
    if (phase === 'logo') setup.logoUrl = urlMatch[0];
    if (phase === 'product_photo') setup.productImageUrl = urlMatch[0];
  }

  if (isSkip(message)) {
    if (phase === 'logo') setup.logoSkipped = true;
    if (phase === 'product_photo') setup.productImageSkipped = true;
  }

  const hexes = message.match(/#[0-9A-Fa-f]{6}/g) || [];
  if (hexes[0]) setup.primaryColor = hexes[0];
  if (hexes[1]) setup.accentColor = hexes[1];

  if (/(azul|blue)/i.test(message) && !setup.primaryColor) setup.primaryColor = '#00D1FF';
  if (/(naranja|orange)/i.test(message) && !setup.accentColor) setup.accentColor = '#FF8A00';
  if (/(verde|green)/i.test(message) && !setup.primaryColor) setup.primaryColor = '#25D366';
  if (/(rojo|red)/i.test(message) && !setup.accentColor) setup.accentColor = '#EF4444';

  const nameMatch = message.match(/(?:se llama|negocio(?:\s+se\s+llama)?|marca)\s+([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ .&-]{2,40})/i);
  if (nameMatch) setup.businessName = nameMatch[1].replace(/[,.].*$/, '').trim();

  // Bare business name when in brand and no price
  if (phase === 'brand' && !setup.businessName && !/\d/.test(message) && message.trim().length >= 2 && message.trim().length <= 40) {
    if (!/colores|azul|naranja|omitir/i.test(lower) || /se llama|negocio|marca/i.test(lower)) {
      const bare = message.replace(/colores?.*/i, '').replace(/[,.].*$/, '').trim();
      if (/negocio|se llama|marca/i.test(lower) || bare.split(/\s+/).length <= 5) {
        // keep nameMatch result; if "Solo tengo el nombre" style handled elsewhere
      }
    }
  }

  const priceMatch = message.match(/(?:rd\$?\s*|\$\s*|precio\s*(?:de\s*)?)(\d+(?:[.,]\d{1,2})?)/i)
    || message.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:pesos|rd\$?)/i);
  if (priceMatch) {
    setup.productPrice = Number(String(priceMatch[1]).replace(',', '.'));
  }

  if (phase === 'product' || phase === 'brand') {
    const productMatch = message.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ0-9][\wÁÉÍÓÚáéíóúñÑ .%-]{1,60}?)\s+(?:a\s+)?(?:rd\$?|\$)?\s*(\d+)/i);
    if (productMatch) {
      setup.productName = productMatch[1].replace(/\s+(rd|precio).*$/i, '').trim();
      setup.productPrice = Number(productMatch[2]);
    } else if (!setup.productName && priceMatch) {
      const before = message.slice(0, message.toLowerCase().indexOf(priceMatch[0])).trim();
      const cleaned = before
        .replace(/^(el\s+producto\s+(es|se llama)\s+)/i, '')
        .replace(/[,:]\s*$/, '')
        .trim();
      if (cleaned.length >= 2 && cleaned.length <= 60) setup.productName = cleaned;
    }
  }

  if (phase === 'catalog' || lower.includes('catálogo') || lower.includes('catalogo')) {
    const slash = message.match(/([^/]+)\s*\/\s*([a-z0-9-]{2,40})/i);
    if (slash) {
      setup.catalogName = slash[1].trim();
      setup.catalogSlug = slugify(slash[2]);
    } else if (/^[A-Za-z0-9ÁÉÍÓÚáéíóúñÑ ._-]{2,40}$/.test(message.trim()) && !priceMatch && phase === 'catalog') {
      setup.catalogName = message.trim();
      setup.catalogSlug = slugify(message.trim());
    }
  }

  const phone = message.replace(/\D/g, '');
  if (phone.length >= 10 && phone.length <= 15) setup.whatsappNumber = phone;

  return setup;
}

function mergeSetup(a: OnboardingSetup, b?: OnboardingSetup): OnboardingSetup {
  if (!b) return { ...a };
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v !== undefined && v !== null && v !== '') (out as any)[k] = v;
  }
  return out;
}

function askUploadFor(phase: OnboardingPhase): AskUpload {
  if (phase === 'logo') return 'logo';
  if (phase === 'product_photo') return 'product';
  return null;
}

@Injectable()
export class OnboardingChatService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private tools: AiToolsService,
  ) {}

  private gemini() {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) return null;
    return new GoogleGenerativeAI(key);
  }

  async getContext(sellerId: string) {
    const [seller] = await this.db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
    const [branding] = await this.db.select().from(sellerBranding).where(eq(sellerBranding.sellerId, sellerId)).limit(1);
    const [settings] = await this.db.select().from(sellerSettings).where(eq(sellerSettings.sellerId, sellerId)).limit(1);
    return { seller, branding, settings };
  }

  initialMessage(sellerName: string): OnboardingChatResponse {
    return {
      reply: `¡Hola! Soy tu asistente de Catagce. Vamos a dejar **${sellerName}** listo para vender por WhatsApp en pocos minutos.\n\n¿Cómo se llama tu negocio y qué colores representan tu marca? (ej. azul #00D1FF y naranja #FF8A00)`,
      readyToApply: false,
      phase: 'brand',
      askUpload: null,
      suggestions: [
        'Mi negocio se llama Renace Tech, colores azul y naranja',
        'Solo tengo el nombre por ahora',
      ],
    };
  }

  private replyForPhase(
    phase: OnboardingPhase,
    setup: OnboardingSetup,
    sellerName: string,
  ): OnboardingChatResponse {
    const name = setup.businessName || sellerName;

    if (phase === 'brand') {
      return {
        reply: `¡Hola! Vamos a configurar **${name}**. ¿Cómo se llama tu negocio y qué colores de marca usas?`,
        setup,
        phase: 'brand',
        askUpload: null,
        readyToApply: false,
        suggestions: ['Mi negocio se llama Renace Tech, azul y naranja', 'Solo el nombre por ahora'],
      };
    }

    if (phase === 'logo') {
      return {
        reply: `Excelente${setup.businessName ? `, **${setup.businessName}**` : ''}. Sube el **logo** de tu empresa (PNG o JPG). Si no lo tienes a mano, puedes omitirlo.`,
        setup,
        phase: 'logo',
        askUpload: 'logo',
        readyToApply: false,
        suggestions: ['Omitir logo por ahora'],
      };
    }

    if (phase === 'product') {
      return {
        reply: `Ahora dime el nombre de tu primer producto y su precio en pesos dominicanos.`,
        setup,
        phase: 'product',
        askUpload: null,
        readyToApply: false,
        suggestions: ['Camiseta polo RD$850', 'Loción capilar RD$1200'],
      };
    }

    if (phase === 'product_photo') {
      return {
        reply: `¿Tienes una **foto** de **${setup.productName || 'tu producto'}**? Súbela para que se vea bien en el catálogo. También puedes omitirla.`,
        setup,
        phase: 'product_photo',
        askUpload: 'product',
        readyToApply: false,
        suggestions: ['Omitir foto por ahora'],
      };
    }

    if (phase === 'catalog') {
      return {
        reply: `Perfecto. ¿Cómo quieres llamar tu catálogo y qué URL corta prefieres? (ej. "Catálogo 2026" / renace-2026)`,
        setup,
        phase: 'catalog',
        askUpload: null,
        readyToApply: false,
        suggestions: ['Catálogo principal / catalogo-principal', 'POS80'],
      };
    }

    return {
      reply: `¡Todo listo! Tengo marca${setup.logoUrl ? ' + logo' : ''}, producto${setup.productImageUrl ? ' + foto' : ''} y catálogo. Pulsa **Aplicar configuración**.`,
      setup,
      phase: 'done',
      askUpload: null,
      readyToApply: true,
      suggestions: [],
    };
  }

  private normalizeResponse(
    parsed: Partial<OnboardingChatResponse>,
    accumulated: OnboardingSetup,
    forcedPhase: OnboardingPhase,
    sellerName: string,
  ): OnboardingChatResponse {
    const setup = mergeSetup(accumulated, parsed.setup);
    const inferred = inferPhase(setup);
    let phase = maxPhase(forcedPhase, inferred);
    if (parsed.phase && PHASE_ORDER.includes(parsed.phase as OnboardingPhase)) {
      const modelPhase = parsed.phase as OnboardingPhase;
      if (phaseIndex(modelPhase) < phaseIndex(inferred)) phase = inferred;
      else phase = maxPhase(inferred, maxPhase(forcedPhase, modelPhase));
    }

    const ready = Boolean(parsed.readyToApply) || phase === 'done'
      || Boolean(
        setup.productName && setup.productPrice && setup.catalogName && setup.catalogSlug
        && hasLogo(setup) && hasProductImage(setup),
      );

    if (ready) phase = 'done';

    let reply = (parsed.reply || '').trim();
    const wrongProduct = /primer producto|precio en pesos/i.test(reply) && phaseIndex(phase) > phaseIndex('product');
    const wrongBrand = /colores representan|cómo se llama tu negocio/i.test(reply) && phaseIndex(phase) > 0;
    if (!reply || wrongProduct || wrongBrand) {
      reply = this.replyForPhase(phase, setup, sellerName).reply;
    }

    const base = this.replyForPhase(phase, setup, sellerName);
    return {
      reply,
      setup,
      phase,
      readyToApply: ready || phase === 'done',
      suggestions: phase === 'done' ? [] : (parsed.suggestions?.length ? parsed.suggestions : base.suggestions),
      askUpload: askUploadFor(phase),
    };
  }

  async chat(
    sellerId: string,
    _userId: string,
    message: string,
    history: { role: string; content: string }[],
    clientSetup: OnboardingSetup = {},
    clientPhase?: OnboardingPhase,
  ) {
    const ctx = await this.getContext(sellerId);
    const sellerName = ctx.seller?.name || 'tu negocio';
    const lower = message.toLowerCase().trim();
    const affirming = /^(sí|si|ok|dale|créalo|crealo|hazlo|aplica|listo|vamos|claro|perfecto)/i.test(lower);

    let phase: OnboardingPhase = clientPhase && PHASE_ORDER.includes(clientPhase)
      ? clientPhase
      : inferPhase(clientSetup);

    const extracted = extractFromMessage(message, phase);
    let accumulated = mergeSetup(clientSetup, extracted);

    // Upload confirmations from UI
    if (/sub[ií]|logo|imagen|foto/i.test(lower) && (accumulated.logoUrl || accumulated.productImageUrl)) {
      // keep extracted urls
    }

    // After brand fields → logo
    if (phase === 'brand' && (accumulated.businessName || accumulated.primaryColor)) {
      phase = inferPhase(accumulated);
    }

    // Logo done → product
    if (phase === 'logo' && hasLogo(accumulated)) {
      phase = 'product';
      return this.normalizeResponse(
        this.replyForPhase('product', accumulated, sellerName),
        accumulated,
        'product',
        sellerName,
      );
    }

    // Affirm after product text → product_photo (not catalog)
    if (affirming && accumulated.productName && accumulated.productPrice && phaseIndex(phase) <= phaseIndex('product')) {
      phase = 'product_photo';
      return this.replyForPhase('product_photo', accumulated, sellerName);
    }

    // Product filled → photo
    if (phase === 'product' && accumulated.productName && accumulated.productPrice) {
      phase = 'product_photo';
      return this.normalizeResponse(
        this.replyForPhase('product_photo', accumulated, sellerName),
        accumulated,
        'product_photo',
        sellerName,
      );
    }

    // Photo done → catalog
    if (phase === 'product_photo' && hasProductImage(accumulated)) {
      phase = 'catalog';
      return this.normalizeResponse(
        this.replyForPhase('catalog', accumulated, sellerName),
        accumulated,
        'catalog',
        sellerName,
      );
    }

    // Catalog name → done
    if (phase === 'catalog' && accumulated.catalogName && accumulated.catalogSlug) {
      return this.normalizeResponse(
        { reply: '', setup: accumulated, phase: 'done', readyToApply: true, suggestions: [] },
        accumulated,
        'done',
        sellerName,
      );
    }

    const nextInferred = inferPhase(accumulated);
    if (phaseIndex(nextInferred) > phaseIndex(phase)) phase = nextInferred;

    const genAI = this.gemini();
    if (!genAI) {
      return this.normalizeResponse(
        this.replyForPhase(phase, accumulated, sellerName),
        accumulated,
        phase,
        sellerName,
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const transcript = history.slice(-10).map((m) => `${m.role}: ${m.content}`).join('\n');
    const prompt = `${PROMPT}

Fase actual (OBLIGATORIA): ${phase}
Setup acumulado: ${JSON.stringify(accumulated)}
Negocio: ${JSON.stringify({ name: ctx.seller?.name, slug: ctx.seller?.slug })}

Historial:
${transcript}

Usuario: ${message}

Si phase es logo o product_photo, askUpload debe ser "logo" o "product".
Nunca preguntes de nuevo por producto si ya está en setup.`;

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw) as OnboardingChatResponse;
      return this.normalizeResponse(parsed, accumulated, phase, sellerName);
    } catch {
      if (phase === 'catalog' && message.trim().length >= 2) {
        accumulated.catalogName = accumulated.catalogName || message.trim();
        accumulated.catalogSlug = accumulated.catalogSlug || slugify(message.trim());
        phase = inferPhase(accumulated);
      }
      return this.normalizeResponse(
        this.replyForPhase(phase, accumulated, sellerName),
        accumulated,
        phase,
        sellerName,
      );
    }
  }

  async apply(sellerId: string, userId: string, setup: OnboardingSetup) {
    if (setup.businessName) {
      await this.db.update(sellers).set({ name: setup.businessName, updatedAt: new Date() })
        .where(eq(sellers.id, sellerId));
    }

    if (setup.primaryColor || setup.accentColor || setup.welcomeMessage || setup.logoUrl) {
      await this.db.update(sellerBranding).set({
        ...(setup.primaryColor ? { primaryColor: setup.primaryColor } : {}),
        ...(setup.accentColor ? { accentColor: setup.accentColor } : {}),
        ...(setup.welcomeMessage ? { welcomeMessage: setup.welcomeMessage } : {}),
        ...(setup.logoUrl ? { logoUrl: setup.logoUrl } : {}),
        updatedAt: new Date(),
      }).where(eq(sellerBranding.sellerId, sellerId));
    }

    if (setup.whatsappNumber) {
      await this.db.update(sellerSettings).set({
        whatsappNumber: setup.whatsappNumber.replace(/\D/g, ''),
        updatedAt: new Date(),
      }).where(eq(sellerSettings.sellerId, sellerId));
      await this.db.update(sellers).set({ phone: setup.whatsappNumber.replace(/\D/g, '') })
        .where(eq(sellers.id, sellerId));
    }

    if (setup.productName && setup.productPrice) {
      await this.tools.execute('create_product', {
        name: setup.productName,
        basePrice: setup.productPrice,
        initialStock: 50,
        ...(setup.productImageUrl ? { imageUrl: setup.productImageUrl } : {}),
      }, sellerId, userId);
    }

    if (setup.catalogName) {
      const slug = setup.catalogSlug || slugify(setup.catalogName);
      const products = await this.tools.execute('list_products', {}, sellerId, userId) as { id: string }[];
      await this.tools.execute('create_catalog', {
        name: setup.catalogName,
        slug,
        productIds: products.slice(0, 10).map((p) => p.id),
      }, sellerId, userId);
    }

    await this.db.update(sellerSettings).set({
      onboardingCompleted: true,
      onboardingStep: 5,
      updatedAt: new Date(),
    }).where(eq(sellerSettings.sellerId, sellerId));

    return { ok: true };
  }
}
