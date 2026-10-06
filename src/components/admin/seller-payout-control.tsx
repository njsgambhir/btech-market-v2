"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SellerPayoutControl({
  sellerId,
  availableCents,
}: {
  sellerId: string;
  availableCents: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function runPayout() {
    if (availableCents <= 0 || busy) return;
    if (!window.confirm(`Simulate seller payout of US$${(availableCents / 100).toFixed(2)}?`)) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payouts/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Payout could not be completed.");
        return;
      }
      setMessage(`Test payout completed: US$${(data.amountCents / 100).toFixed(2)}.`);
      router.refresh();
    } catch {
      setMessage("Payout could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button className="button secondary" type="button" onClick={runPayout} disabled={busy || availableCents <= 0}>
        {busy ? "Processing…" : "Run test payout"}
      </button>
      {message ? <p style={{ marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
