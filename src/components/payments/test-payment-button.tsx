"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TestPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const start = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const payment = await start.json();
      if (!start.ok) throw new Error(payment.error ?? "Payment could not be started.");

      const complete = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.paymentId }),
      });
      const result = await complete.json();
      if (!complete.ok) throw new Error(result.error ?? "Test payment could not be completed.");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test payment could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <button className="buyButton" type="button" onClick={pay} disabled={busy}>
        {busy ? "Processing test payment..." : "Complete test payment"}
      </button>
      <p>This development-only button simulates a successful payment. No card is charged.</p>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
