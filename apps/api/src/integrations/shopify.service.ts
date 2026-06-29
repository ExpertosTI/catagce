import { Injectable } from '@nestjs/common';

export interface ShopifyConfig {
  shop: string;
  accessToken: string;
}

@Injectable()
export class ShopifyService {
  async fetchProducts(config: ShopifyConfig) {
    const url = `https://${config.shop}/admin/api/2024-01/products.json?limit=250`;
    const response = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': config.accessToken },
    });
    if (!response.ok) throw new Error(`Shopify API error: ${response.status}`);
    const data = await response.json();
    return (data.products || []).map((p: any) => ({
      externalId: String(p.id),
      name: p.title,
      description: p.body_html?.replace(/<[^>]*>/g, '') || '',
      sku: p.variants?.[0]?.sku || null,
      basePrice: String(p.variants?.[0]?.price || '0'),
      imageUrl: p.image?.src || p.images?.[0]?.src,
      qty: p.variants?.[0]?.inventory_quantity || 0,
    }));
  }
}
