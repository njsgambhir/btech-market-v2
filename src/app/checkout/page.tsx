"use client";

import { offers } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-provider";

export default function CheckoutPage() {
  const { items } = useCart();
  const lines = items.flatMap((item) => {
    const offer = offers.find((candidate) => candidate.id === item.offerId);
    return offer ? [{ ...item, offer }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.offer.price * line.quantity, 0);

  if (!lines.length) {
    return (
      <main className="section narrowPage">
        <p className="eyebrow">SECURE CHECKOUT</p>
        <h1 className="pageTitle">Checkout</h1>
        <section className="panel emptyCart">
          <h2>Your cart is empty.</h2>
          <a className="button primary" href="/shop">Shop devices</a>
        </section>
      </main>
    );
  }

  return (
    <main className="section narrowPage">
      <p className="eyebrow">SECURE CHECKOUT</p>
      <h1 className="pageTitle">Checkout</h1>
      <div className="checkoutLayout">
        <form className="panel checkoutForm">
          <h2>Contact</h2>
          <label>Email<input type="email" placeholder="you@example.com" /></label>
          <h2>Delivery address</h2>
          <div className="formGrid">
            <label>First name<input /></label>
            <label>Last name<input /></label>
          </div>
          <label>Address<input /></label>
          <div className="formGrid">
            <label>City<input /></label>
            <label>Postal / ZIP code<input /></label>
          </div>
          <label>Country<select defaultValue="CA"><option value="CA">Canada</option><option value="US">United States</option></select></label>
          <h2>Payment</h2>
          <div className="paymentPlaceholder">
            Payment fields will be provided by the marketplace payment processor. Card data will not be stored by Btech Market.
          </div>
          <button className="buyButton" type="button">Review order</button>
        </form>
        <aside className="summaryCard">
          <h2>Summary</h2>
          {lines.map(({ offer, quantity }) => (
            <div key={offer.id}>
              <span>{offer.model} × {quantity}</span>
              <strong>${(offer.price * quantity).toLocaleString()}</strong>
            </div>
          ))}
          <div><span>Merchandise</span><strong>${subtotal.toLocaleString()}</strong></div>
          <div><span>Shipping & taxes</span><span>Calculated before payment</span></div>
          <div className="summaryTotal"><span>Subtotal</span><strong>${subtotal.toLocaleString()}</strong></div>
        </aside>
      </div>
    </main>
  );
}
