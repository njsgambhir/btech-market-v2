"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "PENDING" | "READY_TO_SHIP" | "SHIPPED" | "RECEIVED_BY_VENDOR" | "CLOSED";

export function VendorReturnControl({ vendorReturnId, status }: { vendorReturnId: string; status: Status }) {
  const router = useRouter();
  const [carrier, setCarrier] = useState("UPS");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(action: "ship" | "receive" | "close") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/vendor-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorReturnId, action, carrier, trackingNumber }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Vendor return update failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vendor return update failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div style={{ marginTop: 10 }}>
    {status === "READY_TO_SHIP" ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
      <label>Carrier<br /><input value={carrier} onChange={(e) => setCarrier(e.target.value)} /></label>
      <label>Tracking number<br /><input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} /></label>
      <button type="button" disabled={busy || !carrier.trim() || !trackingNumber.trim()} onClick={() => submit("ship")}>
        {busy ? "Updating…" : "Mark shipped to vendor"}
      </button>
    </div> : null}
    {status === "SHIPPED" ? <button type="button" disabled={busy} onClick={() => submit("receive")}>
      {busy ? "Updating…" : "Confirm vendor received"}
    </button> : null}
    {status === "RECEIVED_BY_VENDOR" ? <button type="button" disabled={busy} onClick={() => submit("close")}>
      {busy ? "Updating…" : "Close vendor return"}
    </button> : null}
    {status === "CLOSED" ? <p>Vendor return complete.</p> : null}
    {error ? <p>{error}</p> : null}
  </div>;
}
