"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";

type CheckoutOffer = { id: string; model: string; price: number };

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const router = useRouter();
  const [offers, setOffers] = useState<CheckoutOffer[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ids = items.map((item) => item.offerId);
    if (!ids.length) {
      setOffers([]);
      setLoadingCatalog(false);
      return;
    }
    setLoadingCatalog(true);
    fetch("/api/catalog?ids=" + encodeURIComponent(ids.join(",")))
      .then((response) => response.ok ? response.json() : [])
      .then(setOffers)
      .catch(() => setOffers([]))
      .finally(() => setLoadingCatalog(false));
  }, [items]);

  const lines = useMemo(() => items.flatMap((item) => {
    const offer = offers.find((candidate) => candidate.id === item.offerId);
    return offer ? [{ ...item, offer }] : [];
  }), [items, offers]);

  const subtotal = lines.reduce((sum, line) => sum + line.offer.price * line.quantity, 0);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (loadingCatalog || lines.length !== items.length) {
      setError("Your cart has changed. Please return to the cart and review it.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          address: form.get("address"),
          city: form.get("city"),
          postalCode: form.get("postalCode"),
          country: form.get("country"),
          items,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Checkout could not be created.");
      clear();
      router.push("/order-confirmation?order=" + encodeURIComponent(result.orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!items.length) {
    return (
      <main className="section narrowPage">
        <p className="eyebrow">SECURE CHECKOUT</p><h1 className="pageTitle">Checkout</h1>
        <section className="panel emptyCart"><h2>Your cart is empty.</h2><a className="button primary" href="/shop">Shop devices</a></section>
      </main>
    );
  }

  return (
    <main className="section narrowPage">
      <p className="eyebrow">SECURE CHECKOUT</p><h1 className="pageTitle">Checkout</h1>
      <div className="checkoutLayout">
        <form className="panel checkoutForm" onSubmit={submitOrder}>
          <h2>Contact</h2>
          <label>Email<input name="email" type="email" placeholder="you@example.com" required /></label>
          <h2>Delivery address</h2>
          <div className="formGrid">
            <label>First name<input name="firstName" required /></label>
            <label>Last name<input name="lastName" required /></label>
          </div>
          <label>Address<input name="address" required /></label>
          <div className="formGrid">
            <label>City<input name="city" required /></label>
            <label>Postal / ZIP code<input name="postalCode" required /></label>
          </div>
          <label>Country<select name="country" defaultValue="CA"><option value="CA">Canada</option><option value="US">United States</option></select></label>
          <h2>Payment</h2>
          <div className="paymentPlaceholder">Payment processing is not enabled yet. This development checkout reserves inventory and creates a pending order only.</div>
          {error ? <p role="alert">{error}</p> : null}
          <button className="buyButton" type="submit" disabled={submitting || loadingCatalog}>
            {submitting ? "Creating order..." : loadingCatalog ? "Loading cart..." : "Reserve & review order"}
          </button>
        </form>
        <aside className="summaryCard">
          <h2>Summary</h2>
          {lines.map(({ offer, quantity }) => <div key={offer.id}><span>{offer.model} × {quantity}</span><strong>{ "$" + (offer.price * quantity).toLocaleString() }</strong></div>)}
          <div><span>Merchandise</span><strong>{ "$" + subtotal.toLocaleString() }</strong></div>
          <div><span>Shipping & taxes</span><span>Calculated before payment</span></div>
          <div className="summaryTotal"><span>Subtotal</span><strong>{ "$" + subtotal.toLocaleString() }</strong></div>
        </aside>
      </div>
    </main>
  );
}
