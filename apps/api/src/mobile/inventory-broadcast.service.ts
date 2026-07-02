import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type InventorySnapshot = {
  updatedAt: string;
  items: {
    productId: string;
    sku: string;
    name: string;
    unit: string;
    imageUrl: string | null;
    available: boolean;
    availableQty: number;
  }[];
};

@Injectable()
export class InventoryBroadcastService {
  private streams = new Map<string, Subject<InventorySnapshot>>();

  observe(companyId: string): Observable<{ data: InventorySnapshot }> {
    if (!this.streams.has(companyId)) {
      this.streams.set(companyId, new Subject());
    }
    return this.streams.get(companyId)!.pipe(
      map((snapshot) => ({ data: snapshot })),
    );
  }

  publish(companyId: string, snapshot: InventorySnapshot) {
    if (!this.streams.has(companyId)) {
      this.streams.set(companyId, new Subject());
    }
    this.streams.get(companyId)!.next(snapshot);
  }
}
