import { Worker, Job } from 'bullmq';
import { WhatsAppService } from './whatsapp.service';

const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT ?? '6379');

const whatsappService = new WhatsAppService();

const worker = new Worker(
  'notifications',
  async (job: Job) => {
    const { type, data } = job.data as { type: string; data: Record<string, unknown> };

    if (type === 'ORDER_CREATED') {
      const { phone, orderId, sellerName, buyerName, totalAmount } = data as {
        phone: string;
        orderId: string;
        sellerName: string;
        buyerName: string;
        totalAmount: number;
      };
      await whatsappService.sendOrderReceipt(phone, orderId, sellerName, buyerName, totalAmount);
    }
  },
  {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
  },
);

worker.on('completed', (job) => {
  console.log(`[NotificationWorker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[NotificationWorker] Job ${job?.id} failed: ${err.message}`);
});

console.log('🚀 Notification Worker started — queue: notifications');

