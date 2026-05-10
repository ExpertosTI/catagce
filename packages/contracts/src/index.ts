import { z } from 'zod';

// Seller Schemas
export const SellerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});

export type Seller = z.infer<typeof SellerSchema>;

// Order Schemas
export const CreateOrderSchema = z.object({
  buyerName: z.string().min(2),
  buyerPhone: z.string().min(8),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    uomId: z.number(),
  })),
});

export type CreateOrder = z.infer<typeof CreateOrderSchema>;

// Auth
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
