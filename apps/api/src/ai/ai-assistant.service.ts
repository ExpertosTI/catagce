import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { and, asc, eq } from 'drizzle-orm';
import { sellerSettings, aiChatSessions, aiChatMessages } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { AiToolsService } from './ai-tools.service';
import { decryptSecret, encryptSecret } from '../common/security/crypto.util';

const SYSTEM_PROMPT = `Eres Catagce AI, el super-asistente inteligente de la plataforma Catagce B2B.
Puedes ejecutar CUALQUIER acción en la aplicación usando las herramientas disponibles.

Capacidades:
- Gestionar productos (crear, listar, actualizar, variantes)
- Gestionar inventario (stock, entradas, ajustes, alertas)
- Crear y publicar catálogos para compartir con clientes
- Gestionar pedidos (listar, confirmar, rechazar)
- Configurar branding y webhooks
- Sincronizar integraciones (Odoo, Shopify, WooCommerce)
- Ver analíticas del negocio

Reglas:
- Responde siempre en español, de forma clara y profesional
- Antes de acciones destructivas, confirma con el usuario
- Usa las herramientas para datos reales, nunca inventes información
- Si falta información para una acción, pregunta al usuario
- Sé proactivo sugiriendo mejoras al negocio B2B del vendedor`;

const TOOL_DECLARATIONS = [
  { name: 'list_products', description: 'Lista todos los productos del vendedor con stock', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'get_product', description: 'Obtiene detalle de un producto por ID', parameters: { type: SchemaType.OBJECT, properties: { productId: { type: SchemaType.STRING } }, required: ['productId'] } },
  { name: 'create_product', description: 'Crea un nuevo producto', parameters: { type: SchemaType.OBJECT, properties: {
    name: { type: SchemaType.STRING }, sku: { type: SchemaType.STRING },
    basePrice: { type: SchemaType.NUMBER }, b2bPrice: { type: SchemaType.NUMBER },
    description: { type: SchemaType.STRING }, category: { type: SchemaType.STRING },
    imageUrl: { type: SchemaType.STRING }, initialStock: { type: SchemaType.NUMBER },
  }, required: ['name', 'basePrice'] } },
  { name: 'update_product', description: 'Actualiza un producto existente', parameters: { type: SchemaType.OBJECT, properties: {
    productId: { type: SchemaType.STRING }, name: { type: SchemaType.STRING },
    basePrice: { type: SchemaType.NUMBER }, b2bPrice: { type: SchemaType.NUMBER },
    description: { type: SchemaType.STRING }, isActive: { type: SchemaType.BOOLEAN },
  }, required: ['productId'] } },
  { name: 'list_catalogs', description: 'Lista catálogos del vendedor', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'create_catalog', description: 'Crea un catálogo con productos', parameters: { type: SchemaType.OBJECT, properties: {
    name: { type: SchemaType.STRING }, slug: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING }, productIds: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  }, required: ['name', 'slug'] } },
  { name: 'publish_catalog', description: 'Publica un catálogo y genera enlace compartible', parameters: { type: SchemaType.OBJECT, properties: {
    catalogId: { type: SchemaType.STRING },
  }, required: ['catalogId'] } },
  { name: 'list_orders', description: 'Lista pedidos recientes', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'update_order_status', description: 'Cambia estado de un pedido: confirmed, rejected, cancelled', parameters: { type: SchemaType.OBJECT, properties: {
    orderId: { type: SchemaType.STRING }, status: { type: SchemaType.STRING },
  }, required: ['orderId', 'status'] } },
  { name: 'get_inventory', description: 'Obtiene niveles de stock de todos los productos', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'get_low_stock', description: 'Productos con stock bajo', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'adjust_stock', description: 'Ajusta stock de un producto (+/-)', parameters: { type: SchemaType.OBJECT, properties: {
    productId: { type: SchemaType.STRING }, quantity: { type: SchemaType.NUMBER },
    notes: { type: SchemaType.STRING },
  }, required: ['productId', 'quantity'] } },
  { name: 'inbound_stock', description: 'Registra entrada de mercancía', parameters: { type: SchemaType.OBJECT, properties: {
    productId: { type: SchemaType.STRING }, quantity: { type: SchemaType.NUMBER },
    notes: { type: SchemaType.STRING },
  }, required: ['productId', 'quantity'] } },
  { name: 'get_analytics', description: 'Obtiene métricas del dashboard', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'list_integrations', description: 'Lista integraciones configuradas', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'sync_integration', description: 'Sincroniza productos desde Odoo/Shopify/WooCommerce', parameters: { type: SchemaType.OBJECT, properties: {
    integrationId: { type: SchemaType.STRING },
  }, required: ['integrationId'] } },
  { name: 'update_branding', description: 'Actualiza colores y mensaje de bienvenida', parameters: { type: SchemaType.OBJECT, properties: {
    primaryColor: { type: SchemaType.STRING }, accentColor: { type: SchemaType.STRING },
    welcomeMessage: { type: SchemaType.STRING }, logoUrl: { type: SchemaType.STRING },
  } } },
  { name: 'create_webhook', description: 'Crea un webhook para eventos externos', parameters: { type: SchemaType.OBJECT, properties: {
    url: { type: SchemaType.STRING }, events: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  }, required: ['url', 'events'] } },
  { name: 'get_seller_profile', description: 'Obtiene perfil del vendedor', parameters: { type: SchemaType.OBJECT, properties: {} } },
];

@Injectable()
export class AiAssistantService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private toolsService: AiToolsService,
  ) {}

  async getConfig(sellerId: string) {
    const settings = await this.db.query.sellerSettings.findFirst({
      where: eq(sellerSettings.sellerId, sellerId),
    });
    let preview: string | null = null;
    if (settings?.googleAiApiKey) {
      try {
        const plain = decryptSecret(settings.googleAiApiKey) || '';
        preview = plain.length > 10 ? `${plain.slice(0, 6)}…${plain.slice(-4)}` : '••••';
      } catch {
        preview = '••••';
      }
    }
    return {
      aiEnabled: settings?.aiEnabled ?? true,
      aiModel: settings?.aiModel ?? process.env.GOOGLE_AI_MODEL ?? 'gemini-2.5-flash',
      hasApiKey: Boolean(settings?.googleAiApiKey),
      apiKeyPreview: preview,
    };
  }

  async updateConfig(sellerId: string, data: { googleAiApiKey?: string; aiModel?: string; aiEnabled?: boolean }) {
    const patch: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (typeof data.googleAiApiKey === 'string' && data.googleAiApiKey.trim()) {
      patch.googleAiApiKey = encryptSecret(data.googleAiApiKey.trim());
    } else {
      delete patch.googleAiApiKey;
    }
    const existing = await this.db.query.sellerSettings.findFirst({
      where: eq(sellerSettings.sellerId, sellerId),
    });
    if (existing) {
      await this.db.update(sellerSettings)
        .set(patch)
        .where(eq(sellerSettings.sellerId, sellerId));
      return this.getConfig(sellerId);
    }
    await this.db.insert(sellerSettings).values({ sellerId, ...patch });
    return this.getConfig(sellerId);
  }

  async chat(sellerId: string, userId: string, message: string, sessionId?: string) {
    const cleanMessage = String(message || '').trim().slice(0, 4000);
    if (!cleanMessage) throw new BadRequestException('Mensaje vacío');

    const settings = await this.db.query.sellerSettings.findFirst({
      where: eq(sellerSettings.sellerId, sellerId),
    });

    let apiKey = process.env.GOOGLE_AI_API_KEY || '';
    if (settings?.googleAiApiKey) {
      try {
        apiKey = decryptSecret(settings.googleAiApiKey) || apiKey;
      } catch {
        apiKey = String(settings.googleAiApiKey);
      }
    }
    if (!apiKey) {
      throw new BadRequestException(
        'Configura tu Google AI API Key en Configuración → Superpower AI. Obtén una en https://aistudio.google.com/apikey',
      );
    }

    let session = sessionId
      ? await this.db.query.aiChatSessions.findFirst({
          where: and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.sellerId, sellerId)),
        })
      : null;

    if (!session) {
      [session] = await this.db.insert(aiChatSessions).values({
        sellerId, userId, title: cleanMessage.slice(0, 50),
      }).returning();
    }

    const history = await this.db.query.aiChatMessages.findMany({
      where: eq(aiChatMessages.sessionId, session.id),
      orderBy: [asc(aiChatMessages.createdAt)],
      limit: 24,
    });

    await this.db.insert(aiChatMessages).values({
      sessionId: session.id, role: 'user', content: cleanMessage,
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: settings?.aiModel || process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS as any }],
    });

    const chatHistory = history.slice(-20).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').slice(0, 4000) }],
    }));

    const chat = model.startChat({ history: chatHistory });
    let result = await chat.sendMessage(cleanMessage);
    let iterations = 0;
    const actionsPerformed: string[] = [];

    while (iterations < 8) {
      const functionCalls = result.response.functionCalls();
      if (!functionCalls?.length) break;

      const functionResponses = [];
      for (const call of functionCalls) {
        const toolResult = await this.toolsService.execute(
          call.name, call.args as Record<string, unknown>, sellerId, userId,
        );
        actionsPerformed.push(`${call.name}: ${JSON.stringify(toolResult).slice(0, 100)}`);
        functionResponses.push({
          functionResponse: { name: call.name, response: toolResult },
        });
      }

      result = await chat.sendMessage(functionResponses);
      iterations++;
    }

    const reply = result.response.text();

    await this.db.insert(aiChatMessages).values({
      sessionId: session.id, role: 'assistant', content: reply,
      toolCalls: actionsPerformed.length ? actionsPerformed : null,
    });

    await this.db.update(aiChatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(aiChatSessions.id, session.id));

    return {
      sessionId: session.id,
      reply,
      actionsPerformed,
    };
  }

  async getSessions(sellerId: string) {
    const sessions = await this.db.query.aiChatSessions.findMany({
      where: eq(aiChatSessions.sellerId, sellerId),
    });
    return sessions.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 20);
  }

  async getSessionMessages(sessionId: string, sellerId: string) {
    const session = await this.db.query.aiChatSessions.findFirst({
      where: eq(aiChatSessions.id, sessionId),
    });
    if (!session || session.sellerId !== sellerId) throw new BadRequestException('Sesión no encontrada');

    return this.db.query.aiChatMessages.findMany({
      where: eq(aiChatMessages.sessionId, sessionId),
    });
  }
}
