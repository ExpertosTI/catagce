import React, { createContext, useContext, useMemo, useState } from 'react';

export type CartItem = {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  totalUnits: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    totalUnits: items.reduce((sum, i) => sum + i.quantity, 0),
    addItem(item, qty = 1) {
      setItems((prev) => {
        const existing = prev.find((p) => p.productId === item.productId);
        if (existing) {
          return prev.map((p) => p.productId === item.productId
            ? { ...p, quantity: p.quantity + qty }
            : p);
        }
        return [...prev, { ...item, quantity: qty }];
      });
    },
    setQuantity(productId, quantity) {
      setItems((prev) => {
        if (quantity <= 0) return prev.filter((p) => p.productId !== productId);
        return prev.map((p) => p.productId === productId ? { ...p, quantity } : p);
      });
    },
    removeItem(productId) {
      setItems((prev) => prev.filter((p) => p.productId !== productId));
    },
    clear() {
      setItems([]);
    },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
