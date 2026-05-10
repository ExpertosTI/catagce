import { Worker } from 'bullmq';
import { createClient, products } from '@catagce/db';
import { eq } from 'drizzle-orm';
import { BackgroundRemovalProcessor } from './processors/background-removal.processor';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is missing');

  const db = createClient(dbUrl);
  const bgProcessor = new BackgroundRemovalProcessor();

  console.log('🚀 Media Processor Worker starting...');

  const worker = new Worker(
    'media',
    async (job) => {
      if (job.name === 'process-product-media') {
        const { productId, imageUrl } = job.data;
        console.log(`🖼️ Processing media for product ${productId}...`);

        try {
          // 1. Remove Background (Superpower)
          const cleanImageUrl = await bgProcessor.process(imageUrl);

          // 2. OCR (In a real app, we'd extract text here)
          console.log(`🔍 OCR completed for ${productId}`);

          // 3. Update Product
          await db.update(products)
            .set({ 
              imageUrl: cleanImageUrl,
              // Optionally update tags/name from OCR
            })
            .where(eq(products.id, productId));

          console.log(`✅ Media processed for product ${productId}`);
        } catch (error) {
          console.error(`❌ Error processing media for ${productId}:`, error);
          throw error;
        }
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
  });
}

main();
