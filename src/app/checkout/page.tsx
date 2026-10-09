
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

type CreatedOrder = {
  id: string;
  status: string;
  totalCents: number;
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
  const [errors, setErrors] = useState<
    Partial<Record<keyof CheckoutFields, string>>
  >({});
  const [reviewReady, setReviewReady] = useState(false);
  const [reviewRequest, setReviewRequest] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const reviewRef = useRef<HTMLElement | null>(null);
  const submittingRef = useRef(false);

  const lines = items.flatMap((item) => {
    const offer = offers.find(
      (candidate) => candidate.id === item.offerId
    );
    return offer ? [{ ...item, offer }] : [];
  });

  const subtotal = lines.reduce(
    (sum, line) => sum + line.offer.price * line.quantity,
    0
  );

  const shippingAddress = useMemo(
    () =>
      [
        fields.address,
        fields.city,
        fields.postalCode,
        fields.country,
      ]
        .filter(Boolean)
        .join(", "),
    [fields]
  );

  useEffect(() => {
    if (reviewReady) {
      reviewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [reviewReady, reviewRequest]);

  function updateField(name: keyof CheckoutFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setReviewReady(false);
    setOrderError("");
  }

  function handleReviewOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = requiredFields.reduce<
      Partial<Record<keyof CheckoutFields, string>>
    >((current, [name, message]) => {
      return fields[name].trim()
        ? current
        : { ...current, [name]: message };
    }, {});

    if (
      fields.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
    ) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;
    setReviewReady(isValid);

    if (isValid) {
      setReviewRequest((current) => current + 1);
    }
  }

  async function handleCreateOrder() {
    if (submittingRef.current || createdOrder || !reviewReady) return;

    submittingRef.current = true;
    setSubmitting(true);
    setOrderError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ offerId, quantity }) => ({
            offerId,
            quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to create order.");
      }

      if (!result.order?.id) {
        throw new Error("The server did not return an order number.");
      }

      setCreatedOrder(result.order);
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "Unable to create order. Please try again."
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!lines.length && !createdOrder) {
    return (
      <main className="section narrowPage">
        <p className="eyebrow">SECURE CHECKOUT</p>
        <h1 className="pageTitle">Checkout</h1>
        <section className="panel emptyCart">
          <h2>Your cart is empty.</h2>
          <a className="button primary" href="/shop">
            Shop devices
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="section narrowPage">
      <p className="eyebrow">SECURE CHECKOUT</p>
      <h1 className="pageTitle">Checkout</h1>

      {createdOrder ? (
        <section className="panel orderReview" aria-live="polite">
          <h2>Pending order created</h2>
          <p>
            Your order has been recorded for development testing.
            No payment has been taken.
          </p>
          <p>
            <strong>Order ID:</strong> {createdOrder.id}
          </p>
          <p>
            <strong>Status:</strong> {createdOrder.status}
          </p>
          <p>
            <strong>Merchandise total:</strong>{" "}
            ${(createdOrder.totalCents / 100).toFixed(2)}
          </p>
          <p className="finePrint">
            This is not a confirmed purchase. Shipping, taxes,
            inventory reservation and payment processing are not
            connected yet. The delivery address has not been saved
            to the order.
          </p>
        </section>
      ) : (
        <>
          <div className="checkoutLayout">
            <form
              className="panel checkoutForm"
              noValidate
              onSubmit={handleReviewOrder}
            >
              <h2>Contact</h2>
              <label>
                Email
                <input
                  aria-invalid={Boolean(errors.email)}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                  placeholder="you@example.com"
                  type="email"
                  value={fields.email}
                />
                {errors.email && (
                  <span className="fieldError">{errors.email}</span>
                )}
              </label>

              <h2>Delivery address</h2>
              <div className="formGrid">
                <label>
                  First name
                  <input
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                    value={fields.firstName}
                  />
                  {errors.firstName && (
                    <span className="fieldError">
                      {errors.firstName}
                    </span>
                  )}
                </label>
                <label>
                  Last name
                  <input
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                    value={fields.lastName}
                  />
                  {errors.lastName && (
                    <span className="fieldError">
                      {errors.lastName}
                    </span>
                  )}
                </label>
              </div>

              <label>
                Address
                <input
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  value={fields.address}
                />
                {errors.address && (
                  <span className="fieldError">{errors.address}</span>
                )}
              </label>

              <div className="formGrid">
                <label>
                  City
                  <input
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    value={fields.city}
                  />
                  {errors.city && (
                    <span className="fieldError">{errors.city}</span>
                  )}
                </label>
                <label>
                  Postal / ZIP code
                  <input
                    onChange={(event) =>
                      updateField("postalCode", event.target.value)
                    }
                    value={fields.postalCode}
                  />
                  {errors.postalCode && (
                    <span className="fieldError">
                      {errors.postalCode}
                    </span>
                  )}
                </label>
              </div>

              <label>
                Country
                <select
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    padding: "10px 12px",
                  }}
                  onChange={(event) =>
                    updateField("country", event.target.value)
                  }
                  value={fields.country}
                >
                  <option value="CA">Canada</option>
                  <option value="US">United States</option>
                </select>
              </label>

              <h2>Payment</h2>
              <div className="paymentPlaceholder">
                Payment fields will be provided by the marketplace
                payment processor. Card data will not be stored
                by Btech Market.
              </div>

              <button className="buyButton" type="submit">
                Review order
              </button>
            </form>

            <aside className="summaryCard">
              <h2>Summary</h2>
              {lines.map(({ offer, quantity }) => (
                <div key={offer.id}>
                  <span>
                    {offer.model} × {quantity}
                  </span>
                  <strong>
                    ${(offer.price * quantity).toLocaleString()}
                  </strong>
                </div>
              ))}
              <div>
                <span>Merchandise</span>
                <strong>${subtotal.toLocaleString()}</strong>
              </div>
              <div>
                <span>Shipping & taxes</span>
                <span>Calculated before payment</span>
              </div>
              <div className="summaryTotal">
                <span>Subtotal</span>
                <strong>${subtotal.toLocaleString()}</strong>
              </div>
            </aside>
          </div>

          {reviewReady && (
            <section
              className="panel orderReview"
              aria-live="polite"
              ref={reviewRef}
            >
              <p className="eyebrow">ORDER REVIEW</p>
              <h2>Review your order</h2>

              <button
                type="button"
                className="button secondary"
                disabled={submitting}
                onClick={() => {
                  setReviewReady(false);
                  setOrderError("");
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
              >
                Edit details
              </button>

              <div className="reviewGrid">
                <div>
                  <strong>Customer</strong>
                  <span>
                    {fields.firstName} {fields.lastName}
                  </span>
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
                    <span>
                      {offer.model} × {quantity}
                    </span>
                    <strong>
                      ${(offer.price * quantity).toLocaleString()}
                    </strong>
                  </div>
                ))}
                <div className="summaryTotal">
                  <span>Subtotal</span>
                  <strong>${subtotal.toLocaleString()}</strong>
                </div>
              </div>

              <p className="finePrint">
                Development test only. This creates an unpaid order
                record. It does not reserve inventory, save delivery
                details or process payment. You must be signed in.
              </p>

              {orderError && (
                <p className="fieldError" role="alert">
                  {orderError}
                </p>
              )}

              <button
                className="buyButton"
                type="button"
                disabled={submitting}
                onClick={handleCreateOrder}
              >
                {submitting
                  ? "Creating pending order..."
                  : "Create Pending Order (Test)"}
              </button>
            </section>
          )}
        </>
      )}
    </main>
  );
}
