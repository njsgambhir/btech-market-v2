import { cartDetails, cartTotal, demoCart } from "@/lib/cart";

export default function CartPage() {
  const lines = cartDetails(demoCart);
  const subtotal = cartTotal(demoCart);

  return (
    <main className="section narrowPage">
      <p className="eyebrow">YOUR CART</p>
      <h1 className="pageTitle">Ready when you are.</h1>
      <div className="checkoutLayout">
        <section className="panel">
          {lines.map(({ offer, quantity }) => (
            <article className="cartLine" key={offer.id}>
              <div className="cartThumb">{offer.brand}</div>
              <div>
                <strong>{offer.model}</strong>
                <p>{offer.storage} · {offer.color} · {offer.grade}</p>
                <p>Seller: {offer.seller} · Qty {quantity}</p>
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
    </main>
  );
}
