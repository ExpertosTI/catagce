import { Injectable } from '@nestjs/common';

export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

@Injectable()
export class WooCommerceService {
  async fetchProducts(config: WooCommerceConfig) {
    const baseUrl = config.url.replace(/\/$/, '');
    const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
    const response = await fetch(`${baseUrl}/wp-json/wc/v3/products?per_page=100`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!response.ok) throw new Error(`WooCommerce API error: ${response.status}`);
    const products = await response.json();
    return (products || []).map((p: any) => ({
      externalId: String(p.id),
      name: p.name,
      description: p.description?.replace(/<[^>]*>/g, '') || '',
      sku: p.sku || null,
      basePrice: String(p.price || '0'),
      imageUrl: p.images?.[0]?.src,
      qty: p.stock_quantity || 0,
    }));
  }
}
