"use client";

import { useCart } from "./cart-provider";

export function AddToCartButton({ offerId }: { offerId: string }) {
  const { add } = useCart();
  return <button className="buyButton" type="button" onClick={() => add(offerId)}>Add to cart</button>;
}
