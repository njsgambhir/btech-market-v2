"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FulfillmentStatus = "PAID" | "PROCESSING" | "SHIPPED";

export function TestFulfillmentControls({
  orderId,
  status,
}: {
  orderId: string;
  status: FulfillmentStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [carrier, setCarrier] = useState("UPS");
  const [trackingNumber, setTrackingNumber] = useState("TEST-" + orderId.slice(-8).toUpperCase());

  async function transition(action: "processing" | "shipped" | "delivered") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/fulfillment/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action,
          ...(action === "shipped" ? { carrier, trackingNumber } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Fulfillment update failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fulfillment update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="summaryCard" style={{ marginTop: "20px" }}>
      <strong>Development fulfillment test</strong>
      <p>This preview-only control simulates the fulfillment steps. It is disabled in production.</p>

      {status === "PAID" ? (
        <button className="button secondary" type="button" disabled={busy} onClick={() => transition("processing")}>
          {busy ? "Updating..." : "Mark processing"}
        </button>
      ) : null}

      {status === "PROCESSING" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          <label>
            Carrier
            <input value={carrier} onChange={(event) => setCarrier(event.target.value)} />
          </label>
          <label>
            Tracking number
            <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
          </label>
          <button className="button secondary" type="button" disabled={busy} onClick={() => transition("shipped")}>
            {busy ? "Updating..." : "Mark shipped"}
          </button>
        </div>
      ) : null}

      {status === "SHIPPED" ? (
        <button className="button secondary" type="button" disabled={busy} onClick={() => transition("delivered")}>
          {busy ? "Updating..." : "Mark delivered"}
        </button>
      ) : null}

      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
