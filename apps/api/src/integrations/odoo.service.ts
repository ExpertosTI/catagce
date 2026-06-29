import { Injectable } from '@nestjs/common';

export interface OdooConfig {
  url: string;
  database: string;
  username: string;
  apiKey: string;
}

@Injectable()
export class OdooService {
  private async jsonRpc(url: string, service: string, method: string, args: unknown[]) {
    const response = await fetch(`${url.replace(/\/$/, '')}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { service, method, args },
        id: Date.now(),
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.data?.message || data.error.message || 'Odoo RPC error');
    }
    return data.result;
  }

  async authenticate(config: OdooConfig): Promise<number> {
    const uid = await this.jsonRpc(config.url, 'common', 'authenticate', [
      config.database,
      config.username,
      config.apiKey,
      {},
    ]);
    if (!uid) throw new Error('Credenciales Odoo inválidas');
    return uid as number;
  }

  async fetchProducts(config: OdooConfig) {
    const uid = await this.authenticate(config);

    const productIds = await this.jsonRpc(config.url, 'object', 'execute_kw', [
      config.database,
      uid,
      config.apiKey,
      'product.template',
      'search',
      [[['sale_ok', '=', true]]],
      { limit: 500 },
    ]);

    if (!productIds?.length) return [];

    const products = await this.jsonRpc(config.url, 'object', 'execute_kw', [
      config.database,
      uid,
      config.apiKey,
      'product.template',
      'read',
      [productIds],
      { fields: ['id', 'name', 'list_price', 'default_code', 'description_sale', 'qty_available'] },
    ]);

    return products as Array<{
      id: number;
      name: string;
      list_price: number;
      default_code: string | false;
      description_sale: string | false;
      qty_available: number;
    }>;
  }
}
