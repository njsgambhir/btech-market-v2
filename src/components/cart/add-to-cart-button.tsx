"use client";

import { useState } from "react";
import { useCart } from "./cart-provider";

export function AddToCartButton({ offerId }: { offerId: string }) {
  const { add, ready } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(offerId);
    setAdded(true);
  }

  return (
    <button className="buyButton" type="button" onClick={handleAdd} disabled={!ready}>
      {!ready ? "Loading cart..." : added ? "Added to cart ✓" : "Add to cart"}
    </button>
  );
}
