"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { offers } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-provider";

type CheckoutFields = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

const initialFields: CheckoutFields = {
  email: "",
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  postalCode: "",
  country: "CA",
};

const requiredFields: Array<[keyof CheckoutFields, string]> = [
  ["email", "Email is required."],
  ["firstName", "First name is required."],
  ["lastName", "Last name is required."],
  ["address", "Address is required."],
  ["city", "City is required."],
  ["postalCode", "Postal / ZIP code is required."],
];

export default function CheckoutPage() {
  const { items } = useCart();
  const [fields, setFields] = useState<CheckoutFields>(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFields, string>>>({});
  const [reviewReady, setReviewReady] = useState(false);
  const [reviewRequest, setReviewRequest] = useState(0);
  const reviewRef = useRef<HTMLElement | null>(null);
  const lines = items.flatMap((item) => {
    const offer = offers.find((candidate) => candidate.id === item.offerId);
    return offer ? [{ ...item, offer }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.offer.price * line.quantity, 0);
  const shippingAddress = useMemo(
    () => [fields.address, fields.city, fields.postalCode, fields.country].filter(Boolean).join(", "),
    [fields]
  );

  useEffect(() => {
    if (reviewReady) {
      reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [reviewReady, reviewRequest]);

  function updateField(name: keyof CheckoutFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setReviewReady(false);
  }

  function handleReviewOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = requiredFields.reduce<Partial<Record<keyof CheckoutFields, string>>>((current, [name, message]) => {
      return fields[name].trim() ? current : { ...current, [name]: message };
    }, {});

    if (fields.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;
    setReviewReady(isValid);
    if (isValid) setReviewRequest((current) => current + 1);
  }

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
        <form className="panel checkoutForm" noValidate onSubmit={handleReviewOrder}>
          <h2>Contact</h2>
          <label>Email
            <input
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={fields.email}
            />
            {errors.email ? <span className="fieldError" id="email-error">{errors.email}</span> : null}
          </label>
          <h2>Delivery address</h2>
          <div className="formGrid">
            <label>First name
              <input
                aria-describedby={errors.firstName ? "first-name-error" : undefined}
                aria-invalid={Boolean(errors.firstName)}
                onChange={(event) => updateField("firstName", event.target.value)}
                value={fields.firstName}
              />
              {errors.firstName ? <span className="fieldError" id="first-name-error">{errors.firstName}</span> : null}
            </label>
            <label>Last name
              <input
                aria-describedby={errors.lastName ? "last-name-error" : undefined}
                aria-invalid={Boolean(errors.lastName)}
                onChange={(event) => updateField("lastName", event.target.value)}
                value={fields.lastName}
              />
              {errors.lastName ? <span className="fieldError" id="last-name-error">{errors.lastName}</span> : null}
            </label>
          </div>
          <label>Address
            <input
              aria-describedby={errors.address ? "address-error" : undefined}
              aria-invalid={Boolean(errors.address)}
              onChange={(event) => updateField("address", event.target.value)}
              value={fields.address}
            />
            {errors.address ? <span className="fieldError" id="address-error">{errors.address}</span> : null}
          </label>
          <div className="formGrid">
            <label>City
              <input
                aria-describedby={errors.city ? "city-error" : undefined}
                aria-invalid={Boolean(errors.city)}
                onChange={(event) => updateField("city", event.target.value)}
                value={fields.city}
              />
              {errors.city ? <span className="fieldError" id="city-error">{errors.city}</span> : null}
            </label>
            <label>Postal / ZIP code
              <input
                aria-describedby={errors.postalCode ? "postal-code-error" : undefined}
                aria-invalid={Boolean(errors.postalCode)}
                onChange={(event) => updateField("postalCode", event.target.value)}
                value={fields.postalCode}
              />
              {errors.postalCode ? <span className="fieldError" id="postal-code-error">{errors.postalCode}</span> : null}
            </label>
          </div>
          <label>Country
            <select onChange={(event) => updateField("country", event.target.value)} value={fields.country}>
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </label>
          <h2>Payment</h2>
          <div className="paymentPlaceholder">
            Payment fields will be provided by the marketplace payment processor. Card data will not be stored by Btech Market.
          </div>
          <button className="buyButton" type="submit">Review order</button>
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
      {reviewReady ? (
        <section className="panel orderReview" aria-live="polite" ref={reviewRef}>
          <p className="eyebrow">ORDER REVIEW</p>
          <h2>Review your order</h2>
          <div className="reviewGrid">
            <div>
              <strong>Customer</strong>
              <span>{fields.firstName} {fields.lastName}</span>
              <span>{fields.email}</span>
            </div>
            <div>
              <strong>Ship to</strong>
              <span>{shippingAddress}</span>
            </div>
          </div>
          <div className="reviewLines">
            {lines.map(({ offer, quantity }) => (
              <div key={offer.id}>
                <span>{offer.model} × {quantity}</span>
                <strong>${(offer.price * quantity).toLocaleString()}</strong>
              </div>
            ))}
            <div className="summaryTotal"><span>Subtotal</span><strong>${subtotal.toLocaleString()}</strong></div>
          </div>
          <p className="finePrint">This is a review step only. Payment processing and order creation are not connected yet.</p>
        </section>
      ) : null}
    </main>
  );
}
