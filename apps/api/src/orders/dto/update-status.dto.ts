import { IsIn } from 'class-validator';

export const ORDER_STATUS_VALUES = [
  'submitted',
  'reserved',
  'pending_seller_review',
  'confirmed',
  'partially_confirmed',
  'rejected',
  'cancelled',
  'expired',
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUS_VALUES as unknown as string[])
  status!: OrderStatus;
}
