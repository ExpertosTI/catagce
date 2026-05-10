import puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

export class CatalogRenderer {
  async renderPdf(catalogId: string, sellerId: string, catalogData: any): Promise<string> {
    console.log(`[Catalog Superpower] Renderizando PDF para: ${catalogData.name}`);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });

    const page = await browser.newPage();

    // Template HTML con identidad Renace (Brutalista)
    const templateHtml = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;900&display=swap');
            body { font-family: 'Inter', sans-serif; background: #fff; margin: 0; padding: 40px; color: #000; }
            .header { border-bottom: 8px solid #000; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo-text { font-size: 48px; font-weight: 900; letter-spacing: -2px; text-transform: uppercase; }
            .accent { color: #00D1FF; }
            .catalog-name { font-size: 84px; font-weight: 900; line-height: 0.8; margin-bottom: 60px; letter-spacing: -4px; text-transform: uppercase; }
            .grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 40px; }
            .product-card { border: 4px solid #000; padding: 20px; position: relative; }
            .product-image { width: 100%; aspect-ratio: 1; object-fit: cover; border-bottom: 4px solid #000; margin-bottom: 15px; }
            .product-name { font-size: 24px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; }
            .product-price { font-size: 20px; font-weight: 400; color: #666; }
            .qr-section { margin-top: 80px; padding: 40px; background: #000; color: #fff; display: flex; align-items: center; gap: 30px; }
            .qr-text { font-size: 18px; font-weight: 900; text-transform: uppercase; }
            .footer { margin-top: 40px; font-size: 10px; font-weight: 900; color: #999; text-transform: uppercase; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-text">CATAGCE<span class="accent">.</span></div>
            <div style="font-weight: 900; font-size: 12px;">PRODUCIDO POR RENACE.TECH</div>
          </div>
          
          <h1 class="catalog-name">{{name}}</h1>
          
          <div class="grid">
            {{#each products}}
            <div class="product-card">
              <img class="product-image" src="{{imageUrl}}" />
              <div class="product-name">{{name}}</div>
              <div class="product-price">{{basePrice}} USD</div>
            </div>
            {{/each}}
          </div>

          <div class="qr-section">
            <div style="width: 100px; height: 100px; background: #fff; padding: 10px;">
              <!-- Aquí iría el QR generado -->
              <div style="width: 100%; height: 100%; border: 2px solid #000;"></div>
            </div>
            <div class="qr-text">
              ESCANEÁ PARA PEDIR POR WHATSAPP<br/>
              <span class="accent">CATAGCE.RENACE.TECH/C/{{slug}}</span>
            </div>
          </div>

          <div class="footer">© 2026 CATAGCE SYSTEM - POWERED BY RENACETECH</div>
        </body>
      </html>
    `;

    const template = handlebars.compile(templateHtml);
    const html = template(catalogData);

    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfPath = `/tmp/catalog-${catalogId}.pdf`;
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    await browser.close();

    // En una implementación real, subiríamos a S3/R2 aquí
    console.log(`✅ PDF generado exitosamente en: ${pdfPath}`);
    return pdfPath;
  }
}
