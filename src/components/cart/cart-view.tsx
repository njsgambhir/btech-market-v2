"use client";

import { offers } from "@/lib/catalog";
import { useCart } from "./cart-provider";

export function CartView() {
  const { items, remove, setQuantity } = useCart();
  const lines = items.flatMap((item) => {
    const offer = offers.find((candidate) => candidate.id === item.offerId);
    return offer ? [{ ...item, offer }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.offer.price * line.quantity, 0);

  if (!lines.length) {
    return <section className="panel emptyCart"><h2>Your cart is empty.</h2><a className="button primary" href="/shop">Shop devices</a></section>;
  }

  return (
    <div className="checkoutLayout">
      <section className="panel">
        {lines.map(({ offer, quantity }) => (
          <article className="cartLine" key={offer.id}>
            <div className="cartThumb">{offer.brand}</div>
            <div>
              <strong>{offer.model}</strong>
              <p>{offer.storage} · {offer.color} · {offer.grade}</p>
              <label className="quantityLabel">Qty
                <select value={quantity} onChange={(e) => setQuantity(offer.id, Number(e.target.value))}>
                  {[1,2,3,4].map((qty) => <option value={qty} key={qty}>{qty}</option>)}
                </select>
              </label>
              <button className="textButton" type="button" onClick={() => remove(offer.id)}>Remove</button>
            </div>
            <strong>${(offer.price * quantity).toLocaleString()}</strong>
          </article>
        ))}
      </section>
      <aside className="summaryCard">
        <h2>Order summary</h2>
        <div><span>Subtotal</span><strong>${subtotal.toLocaleString()}</strong></div>
        <div><span>Shipping</span><span>Calculated at checkout</span></div>
        <div><span>Taxes</span><span>Calculated at checkout</span></div>
        <div className="summaryTotal"><span>Estimated total</span><strong>${subtotal.toLocaleString()}</strong></div>
        <a className="button primary fullButton" href="/checkout">Continue to checkout</a>
      </aside>
    </div>
  );
}
