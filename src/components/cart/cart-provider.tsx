"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartItem = { offerId: string; quantity: number };
type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (offerId: string) => void;
  remove: (offerId: string) => void;
  setQuantity: (offerId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "btech-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    ready,
    add: (offerId) => setItems((current) => {
      const found = current.find((item) => item.offerId === offerId);
      return found
        ? current.map((item) => item.offerId === offerId ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { offerId, quantity: 1 }];
    }),
    remove: (offerId) => setItems((current) => current.filter((item) => item.offerId !== offerId)),
    setQuantity: (offerId, quantity) => setItems((current) =>
      quantity < 1 ? current.filter((item) => item.offerId !== offerId)
        : current.map((item) => item.offerId === offerId ? { ...item, quantity } : item)
    ),
    clear: () => setItems([]),
  }), [items, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
