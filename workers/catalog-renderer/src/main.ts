import { Worker, Job } from 'bullmq';
import { createClient } from '@catagce/db';
import { CatalogRenderer } from './renderer';

const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT ?? '6379');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) throw new Error('DATABASE_URL is missing');

const db = createClient(DATABASE_URL);
const renderer = new CatalogRenderer();

const worker = new Worker(
  'catalog-render',
  async (job: Job) => {
    const { catalogId, sellerId, catalogData } = job.data as {
      catalogId: string;
      sellerId: string;
      catalogData: Record<string, unknown>;
    };

    console.log(`[CatalogRenderer] Rendering PDF for catalog ${catalogId}`);
    const pdfPath = await renderer.renderPdf(catalogId, sellerId, catalogData);
    console.log(`[CatalogRenderer] PDF saved to ${pdfPath}`);
    return { pdfPath };
  },
  {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
    concurrency: 2,
  },
);

worker.on('completed', (job) => {
  console.log(`[CatalogRenderer] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[CatalogRenderer] Job ${job?.id} failed: ${err.message}`);
});

console.log('🚀 Catalog Renderer Worker started — queue: catalog-render');

