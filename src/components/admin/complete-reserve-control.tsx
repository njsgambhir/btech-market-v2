"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompleteReserveControl({ ledgerEntryId }: { ledgerEntryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function completeReserve() {
    if (busy) return;
    if (!window.confirm("Complete this 7-day reserve now for Preview testing?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payouts/complete-reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ledgerEntryId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Reserve could not be completed.");
        return;
      }
      setMessage("Reserve completed for Preview testing.");
      router.refresh();
    } catch {
      setMessage("Reserve could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button className="button secondary" type="button" onClick={completeReserve} disabled={busy}>
        {busy ? "Updating…" : "Make payout eligible (Preview)"}
      </button>
      {message ? <p style={{ marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
