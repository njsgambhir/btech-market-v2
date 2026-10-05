"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "PAID" | "PROCESSING" | "SHIPPED";

export function SellerFulfillmentControls({ orderId, status }: { orderId: string; status: Status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [carrier, setCarrier] = useState("UPS");
  const [trackingNumber, setTrackingNumber] = useState("");

  async function update(action: "processing" | "shipped" | "delivered") {
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
      if (!response.ok) throw new Error(result.error ?? "Order update failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "14px" }}>
      {status === "PAID" ? (
        <button className="button secondary" disabled={busy} onClick={() => update("processing")}>
          {busy ? "Updating..." : "Start processing"}
        </button>
      ) : null}

      {status === "PROCESSING" ? (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "end" }}>
          <label>Carrier<br /><input value={carrier} onChange={(e) => setCarrier(e.target.value)} /></label>
          <label>Tracking number<br /><input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} /></label>
          <button className="button secondary" disabled={busy || !trackingNumber.trim()} onClick={() => update("shipped")}>
            {busy ? "Updating..." : "Mark shipped"}
          </button>
        </div>
      ) : null}

      {status === "SHIPPED" ? (
        <button className="button secondary" disabled={busy} onClick={() => update("delivered")}>
          {busy ? "Updating..." : "Mark delivered"}
        </button>
      ) : null}

      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
