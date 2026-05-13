import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
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
      message = `*¡Nuevo Pedido Recibido!* \n\nOrden: #${data.orderId.slice(0,8)}\nCliente: ${data.buyerName}\nTotal: $${data.totalAmount}\n\nRevisa tu panel en Catagce.`;
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
    } catch (error: any) {
      this.logger.error(`Error enviando a Evo API: ${error.message}`);
      throw error;
    }
  }
}
