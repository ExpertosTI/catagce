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

export type OnboardingChatResponse = {
  reply: string;
  setup?: OnboardingSetup;
  readyToApply: boolean;
  phase: string;
  suggestions: string[];
};

const PHASES = ['welcome', 'brand', 'product', 'catalog', 'done'];

const PROMPT = `Eres el asistente de configuración de Catagce, plataforma B2B de catálogos y pedidos por WhatsApp en República Dominicana.

Guía al vendedor paso a paso en español, tono cálido y profesional. Una o dos preguntas por turno.

Fases: marca → primer producto → catálogo → listo.

Responde SOLO JSON válido:
{"reply":"...","setup":{...},"readyToApply":false,"phase":"brand","suggestions":["..."]}

setup solo incluye campos mencionados en este turno:
- businessName, welcomeMessage, primaryColor (hex), accentColor (hex)
- productName, productPrice (número)
- catalogName, catalogSlug (minúsculas con guiones)
- whatsappNumber (solo dígitos)

readyToApply=true cuando tengas suficiente para crear producto+catálogo o el usuario pida aplicar.`;

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
      suggestions: ['Mi negocio se llama Renace Tech, colores azul y naranja', 'Solo tengo el nombre por ahora'],
    };
  }

  async chat(sellerId: string, userId: string, message: string, history: { role: string; content: string }[]) {
    const ctx = await this.getContext(sellerId);
    const genAI = this.gemini();

    if (!genAI) {
      return this.fallback(message, ctx.seller?.name || 'tu negocio');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const transcript = history.slice(-8).map((m) => `${m.role}: ${m.content}`).join('\n');
    const prompt = `${PROMPT}\n\nNegocio actual: ${JSON.stringify({
      name: ctx.seller?.name,
      slug: ctx.seller?.slug,
      branding: ctx.branding,
      whatsapp: ctx.settings?.whatsappNumber || ctx.seller?.phone,
    })}\n\nHistorial:\n${transcript}\n\nUsuario: ${message}`;

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw) as OnboardingChatResponse;
      return {
        reply: parsed.reply || 'Cuéntame más sobre tu negocio.',
        setup: parsed.setup,
        readyToApply: Boolean(parsed.readyToApply),
        phase: parsed.phase || 'brand',
        suggestions: parsed.suggestions || [],
      };
    } catch {
      return this.fallback(message, ctx.seller?.name || 'tu negocio');
    }
  }

  private fallback(message: string, name: string): OnboardingChatResponse {
    const lower = message.toLowerCase();
    if (lower.includes('catálogo') || lower.includes('catalogo')) {
      return {
        reply: 'Perfecto. ¿Cómo quieres llamar tu catálogo y qué URL corta prefieres? (ej. "Catálogo 2026" / renace-2026)',
        phase: 'catalog',
        readyToApply: false,
        suggestions: ['Catálogo principal / catalogo-principal'],
      };
    }
    if (/\d+/.test(message) && (lower.includes('precio') || lower.includes('$') || lower.includes('rd'))) {
      return {
        reply: 'Anotado. ¿Quieres que cree ese producto y un catálogo para compartir por WhatsApp?',
        phase: 'product',
        readyToApply: true,
        suggestions: ['Sí, créalo', 'Agregar otro producto primero'],
      };
    }
    return {
      reply: `Entendido. Para **${name}**, dime el nombre de tu primer producto y su precio en pesos dominicanos.`,
      phase: 'product',
      readyToApply: false,
      suggestions: ['Camiseta polo RD$850', 'Loción capilar RD$1200'],
    };
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

    if (setup.catalogName && setup.catalogSlug) {
      const products = await this.tools.execute('list_products', {}, sellerId, userId) as { id: string }[];
      await this.tools.execute('create_catalog', {
        name: setup.catalogName,
        slug: setup.catalogSlug,
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
