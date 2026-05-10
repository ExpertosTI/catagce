import { Worker, Job } from 'bullmq';
import { WhatsAppService } from './whatsapp.service';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const whatsappService = new WhatsAppService();

const worker = new Worker(
  'notifications',
  async (job: Job) => {
    const { type, data } = job.data;

    if (type === 'ORDER_CREATED') {
      const { phone, orderId, sellerName, buyerName, totalAmount } = data;
      await whatsappService.sendOrderReceipt(phone, orderId, sellerName, buyerName, totalAmount);
    }
  },
  {
    connection: {
      url: REDIS_URL,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`[NotificationWorker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[NotificationWorker] Job ${job?.id} failed: ${err.message}`);
});

console.log('🚀 Notification Worker started');
