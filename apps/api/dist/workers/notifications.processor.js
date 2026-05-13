"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NotificationsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
let NotificationsProcessor = NotificationsProcessor_1 = class NotificationsProcessor extends bullmq_1.WorkerHost {
    logger = new common_1.Logger(NotificationsProcessor_1.name);
    async process(job) {
        const { type, data } = job.data;
        this.logger.log(`Procesando notificación: ${type} para ${data.phone}`);
        // CONFIGURACIÓN EVO API
        const EVO_URL = process.env.EVO_API_URL;
        const EVO_KEY = process.env.EVO_API_KEY;
        const EVO_INSTANCE = process.env.EVO_INSTANCE;
        if (!EVO_URL || !EVO_KEY || !EVO_INSTANCE) {
            this.logger.warn('Evo API no configurada. Saltando envío real.');
            return { status: 'skipped', reason: 'no_config' };
        }
        let message = '';
        if (type === 'ORDER_CREATED') {
            message = `*¡Nuevo Pedido Recibido!* \n\nOrden: #${data.orderId.slice(0, 8)}\nCliente: ${data.buyerName}\nTotal: $${data.totalAmount}\n\nRevisa tu panel en Catagce.`;
        }
        try {
            const response = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVO_KEY,
                },
                body: JSON.stringify({
                    number: data.phone,
                    options: { delay: 1200, presence: 'composing' },
                    textMessage: { text: message }
                })
            });
            if (!response.ok) {
                throw new Error(`Evo API error: ${response.statusText}`);
            }
            this.logger.log(`Mensaje enviado con éxito a ${data.phone}`);
            return { status: 'sent' };
        }
        catch (error) {
            this.logger.error(`Error enviando a Evo API: ${error.message}`);
            throw error;
        }
    }
};
exports.NotificationsProcessor = NotificationsProcessor;
exports.NotificationsProcessor = NotificationsProcessor = NotificationsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('notifications')
], NotificationsProcessor);
