// src/index.ts
import { z } from "zod";
var SellerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1)
});
var CreateOrderSchema = z.object({
  buyerName: z.string().min(2),
  buyerPhone: z.string().min(8),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    uomId: z.number()
  }))
});
export {
  CreateOrderSchema,
  SellerSchema
};
