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
  whatsappNumber?: string;
  productName?: string;
  productPrice?: number;
  catalogName?: string;
  catalogSlug?: string;
};

export type OnboardingPhase = 'brand' | 'product' | 'catalog' | 'done';

export type OnboardingChatResponse = {
  reply: string;
  setup?: OnboardingSetup;
  readyToApply: boolean;
  phase: OnboardingPhase;
  suggestions: string[];
};

const PHASE_ORDER: OnboardingPhase[] = ['brand', 'product', 'catalog', 'done'];

const PROMPT = `Eres el asistente de configuración de Catagce (catálogos y pedidos por WhatsApp en RD).

REGLAS ESTRICTAS:
1. Habla en español, cálido y breve (1-3 oraciones).
2. NO repitas preguntas ya respondidas. Usa el setup acumulado.
3. Avanza SOLO en la fase indicada. Nunca retrocedas.
4. Extrae datos del mensaje del usuario y ponlos en setup (solo campos nuevos).
5. Responde SOLO JSON válido, sin markdown:
{"reply":"...","setup":{...},"phase":"brand|product|catalog|done","readyToApply":false,"suggestions":["..."]}

Campos setup: businessName, primaryColor (hex), accentColor (hex), welcomeMessage,
productName, productPrice (número), catalogName, catalogSlug (minúsculas-guiones), whatsappNumber.

Fases:
- brand: nombre + colores
- product: primer producto + precio
- catalog: nombre catálogo + slug
- done: listo para aplicar`;

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

function inferPhase(setup: OnboardingSetup): OnboardingPhase {
  if (setup.catalogName && setup.catalogSlug && setup.productName && setup.productPrice) {
    return 'done';
  }
  if (setup.productName && setup.productPrice) return 'catalog';
  if (setup.businessName || setup.primaryColor) return 'product';
  return 'brand';
}

function extractFromMessage(message: string, phase: OnboardingPhase): OnboardingSetup {
  const setup: OnboardingSetup = {};
  const lower = message.toLowerCase().trim();

  const hexes = message.match(/#[0-9A-Fa-f]{6}/g) || [];
  if (hexes[0]) setup.primaryColor = hexes[0];
  if (hexes[1]) setup.accentColor = hexes[1];

  if (/(azul|blue)/i.test(message) && !setup.primaryColor) setup.primaryColor = '#00D1FF';
  if (/(naranja|orange)/i.test(message) && !setup.accentColor) setup.accentColor = '#FF8A00';
  if (/(verde|green)/i.test(message) && !setup.primaryColor) setup.primaryColor = '#25D366';
  if (/(rojo|red)/i.test(message) && !setup.accentColor) setup.accentColor = '#EF4444';

  const nameMatch = message.match(/(?:se llama|negocio(?:\s+se\s+llama)?|marca)\s+([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ .&-]{2,40})/i);
  if (nameMatch) setup.businessName = nameMatch[1].replace(/[,.].*$/, '').trim();

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
    } else if (/^[A-Za-z0-9ÁÉÍÓÚáéíóúñÑ ._-]{2,40}$/.test(message.trim()) && !priceMatch) {
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
        readyToApply: false,
        suggestions: ['Mi negocio se llama Renace Tech, azul y naranja', 'Solo el nombre por ahora'],
      };
    }

    if (phase === 'product') {
      return {
        reply: `Genial${setup.businessName ? `, **${setup.businessName}**` : ''}. Ahora dime el nombre de tu primer producto y su precio en pesos dominicanos.`,
        setup,
        phase: 'product',
        readyToApply: false,
        suggestions: ['Camiseta polo RD$850', 'Loción capilar RD$1200'],
      };
    }

    if (phase === 'catalog') {
      const productHint = setup.productName
        ? ` con **${setup.productName}**`
        : '';
      return {
        reply: `Perfecto${productHint}. ¿Cómo quieres llamar tu catálogo y qué URL corta prefieres? (ej. "Catálogo 2026" / renace-2026)`,
        setup,
        phase: 'catalog',
        readyToApply: false,
        suggestions: ['Catálogo principal / catalogo-principal', 'POS80'],
      };
    }

    return {
      reply: `¡Todo listo! Tengo marca, producto y catálogo. Pulsa **Aplicar configuración** para crearlos en tu tienda.`,
      setup,
      phase: 'done',
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
    // Never go backwards; prefer inferred progress over model whim
    let phase = maxPhase(forcedPhase, inferred);
    if (parsed.phase) {
      const modelPhase = parsed.phase as OnboardingPhase;
      // Allow model to advance, never retreat below inferred
      phase = maxPhase(inferred, maxPhase(forcedPhase, modelPhase));
      if (phaseIndex(modelPhase) < phaseIndex(inferred)) phase = inferred;
    }

    const ready = Boolean(parsed.readyToApply) || phase === 'done'
      || Boolean(setup.productName && setup.productPrice && setup.catalogName && setup.catalogSlug);

    if (ready) phase = 'done';

    let reply = (parsed.reply || '').trim();
    // If model repeated a previous-phase question, replace with correct phase reply
    const looksLikeProductLoop = /primer producto|precio en pesos/i.test(reply) && phaseIndex(phase) >= phaseIndex('catalog');
    const looksLikeBrandLoop = /colores representan|cómo se llama tu negocio/i.test(reply) && phaseIndex(phase) > 0;
    if (!reply || looksLikeProductLoop || looksLikeBrandLoop) {
      reply = this.replyForPhase(phase === 'done' ? 'done' : phase, setup, sellerName).reply;
    }

    const suggestions = parsed.suggestions?.length
      ? parsed.suggestions
      : this.replyForPhase(phase === 'done' ? 'done' : phase, setup, sellerName).suggestions;

    return {
      reply,
      setup,
      phase,
      readyToApply: ready || phase === 'done',
      suggestions: phase === 'done' ? [] : suggestions,
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

    // Affirmations after product → jump to catalog
    const affirming = /^(sí|si|ok|dale|créalo|crealo|hazlo|aplica|listo|vamos|claro|perfecto)/i.test(lower);

    let phase: OnboardingPhase = clientPhase && PHASE_ORDER.includes(clientPhase)
      ? clientPhase
      : inferPhase(clientSetup);

    // User explicitly asks for catalog
    if (/cat[aá]logo/i.test(lower) && phaseIndex(phase) < phaseIndex('catalog') && clientSetup.productName) {
      phase = 'catalog';
    }

    const extracted = extractFromMessage(message, phase);
    let accumulated = mergeSetup(clientSetup, extracted);

    // "Sí, créalo" with product already known → move to catalog (don't re-ask product)
    if (affirming && accumulated.productName && accumulated.productPrice && phaseIndex(phase) <= phaseIndex('product')) {
      phase = 'catalog';
      accumulated = mergeSetup(accumulated, extracted);
      return this.replyForPhase('catalog', accumulated, sellerName);
    }

    // Short catalog name like "POS80"
    if (phase === 'catalog' && accumulated.catalogName && accumulated.catalogSlug) {
      return this.normalizeResponse(
        { reply: '', setup: accumulated, phase: 'done', readyToApply: true, suggestions: [] },
        accumulated,
        'done',
        sellerName,
      );
    }

    // Deterministic advance when we just filled required fields
    const nextInferred = inferPhase(accumulated);
    if (phaseIndex(nextInferred) > phaseIndex(phase)) {
      phase = nextInferred;
    }

    const genAI = this.gemini();
    if (!genAI) {
      return this.normalizeResponse(
        this.replyForPhase(phase === 'done' ? 'done' : phase, accumulated, sellerName),
        accumulated,
        phase,
        sellerName,
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const transcript = history.slice(-10).map((m) => `${m.role}: ${m.content}`).join('\n');
    const prompt = `${PROMPT}

Fase actual (OBLIGATORIA, no retrocedas): ${phase}
Setup acumulado (ya confirmado): ${JSON.stringify(accumulated)}
Negocio: ${JSON.stringify({
      name: ctx.seller?.name,
      slug: ctx.seller?.slug,
      whatsapp: ctx.settings?.whatsappNumber || ctx.seller?.phone,
    })}

Historial:
${transcript}

Usuario: ${message}

Si el usuario ya dio producto+precio y pide catálogo o da un nombre corto de catálogo, phase debe ser catalog o done.
Nunca preguntes de nuevo por producto si productName y productPrice ya están en el setup.`;

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw) as OnboardingChatResponse;
      return this.normalizeResponse(parsed, accumulated, phase, sellerName);
    } catch {
      // Rule-based path — never loop to product if we already have it
      if (phase === 'catalog' || (accumulated.productName && accumulated.productPrice && /cat[aá]logo|pos\d+/i.test(lower))) {
        if (!accumulated.catalogName && message.trim().length >= 2) {
          accumulated.catalogName = message.trim();
          accumulated.catalogSlug = slugify(message.trim());
        }
        phase = inferPhase(accumulated);
      }
      return this.normalizeResponse(
        this.replyForPhase(phase === 'done' ? 'done' : phase, accumulated, sellerName),
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

    if (setup.primaryColor || setup.accentColor || setup.welcomeMessage) {
      await this.db.update(sellerBranding).set({
        ...(setup.primaryColor ? { primaryColor: setup.primaryColor } : {}),
        ...(setup.accentColor ? { accentColor: setup.accentColor } : {}),
        ...(setup.welcomeMessage ? { welcomeMessage: setup.welcomeMessage } : {}),
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
