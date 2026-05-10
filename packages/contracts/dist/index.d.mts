import { z } from 'zod';

declare const SellerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    slug: string;
}, {
    id: string;
    name: string;
    slug: string;
}>;
type Seller = z.infer<typeof SellerSchema>;
declare const CreateOrderSchema: z.ZodObject<{
    buyerName: z.ZodString;
    buyerPhone: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        uomId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        productId: string;
        quantity: number;
        uomId: number;
    }, {
        productId: string;
        quantity: number;
        uomId: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    buyerName: string;
    buyerPhone: string;
    items: {
        productId: string;
        quantity: number;
        uomId: number;
    }[];
}, {
    buyerName: string;
    buyerPhone: string;
    items: {
        productId: string;
        quantity: number;
        uomId: number;
    }[];
}>;
type CreateOrder = z.infer<typeof CreateOrderSchema>;
interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}

export { type AuthResponse, type CreateOrder, CreateOrderSchema, type Seller, SellerSchema };
