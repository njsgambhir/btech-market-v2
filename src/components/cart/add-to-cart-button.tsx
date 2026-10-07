"use client";

import { useEffect, useState } from "react";
import { useCart } from "./cart-provider";

export function AddToCartButton({ offerId }: { offerId: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 2400);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <div className="addToCartControl">
      <button
        className="buyButton"
        type="button"
        onClick={() => {
          add(offerId);
          setAdded(true);
        }}
      >
        Add to cart
      </button>
      {added ? <p className="cartNotice" aria-live="polite">Added to cart.</p> : null}
    </div>
  );
}
