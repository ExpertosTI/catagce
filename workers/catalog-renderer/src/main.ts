import { createClient } from '@catagce/db';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is missing');

  const db = createClient(dbUrl);
  console.log('🚀 Catalog Renderer Worker connected to DB');

  // Logic to render PDFs
}

main();
