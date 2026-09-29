"use client";

import { useCart } from "./cart-provider";

export function CartLink() {
  const { count } = useCart();
  return <a href="/cart">Cart{count ? ` (${count})` : ""}</a>;
}
