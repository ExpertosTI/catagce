import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsUUID,
  IsPositive,
  IsInt,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID('4', { message: 'productId must be a valid UUID' })
  productId!: string;

  /**
   * Quantity requested by the buyer (in the selected UOM).
   * Must be a positive integer — fractional quantities not allowed at order level.
   */
  @IsInt({ message: 'quantity must be an integer' })
  @IsPositive({ message: 'quantity must be positive' })
  quantity!: number;

  /**
   * Unit of measure ID — optional; defaults to product base UOM if omitted.
   * Server resolves price from catalog snapshot, not from client.
   */
  @IsOptional()
  @IsInt()
  @IsPositive()
  uomId?: number;
}

export class SubmitPublicOrderDto {
  /**
   * Slug of the active catalog — server resolves seller context from this.
   * Clients NEVER provide sellerId directly (multi-tenant security boundary).
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'catalogSlug must be lowercase alphanumeric with dashes' })
  catalogSlug!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  buyerName!: string;

  /**
   * WhatsApp-compatible phone number.
   * Accepts international format: +18091234567 or local 8091234567.
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'buyerPhone must be a valid phone number' })
  buyerPhone!: string;

  /**
   * Client-generated idempotency key to prevent duplicate order submission.
   * Should be a UUID v4 generated once per order form session.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
