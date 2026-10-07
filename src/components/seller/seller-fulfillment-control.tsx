"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SellerFulfillmentControl({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [carrier, setCarrier] = useState("UPS");
  const [trackingNumber, setTrackingNumber] = useState("");

  async function submit(action: "processing" | "shipped" | "delivered") {
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
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Fulfillment update failed.");
        return;
      }
      setTrackingNumber("");
      router.refresh();
    } catch {
      setError("Fulfillment update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "PAID") {
    return (
      <div style={{ marginTop: 10 }}>
        <button className="button secondary" type="button" disabled={busy} onClick={() => submit("processing")}>
          {busy ? "Updating…" : "Mark processing"}
        </button>
        {error ? <p style={{ marginTop: 8 }}>{error}</p> : null}
      </div>
    );
  }

  if (status === "PROCESSING") {
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input aria-label="Carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Carrier" />
          <input aria-label="Tracking number" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Tracking number" />
          <button className="button secondary" type="button" disabled={busy || !carrier.trim() || !trackingNumber.trim()} onClick={() => submit("shipped")}>
            {busy ? "Updating…" : "Mark shipped"}
          </button>
        </div>
        {error ? <p style={{ marginTop: 8 }}>{error}</p> : null}
      </div>
    );
  }

  if (status === "SHIPPED") {
    return (
      <div style={{ marginTop: 10 }}>
        <button className="button secondary" type="button" disabled={busy} onClick={() => submit("delivered")}>
          {busy ? "Updating…" : "Mark delivered (Preview)"}
        </button>
        {error ? <p style={{ marginTop: 8 }}>{error}</p> : null}
      </div>
    );
  }

  return null;
}
