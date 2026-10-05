"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReturnInspectionControl({ orderId, inventoryStatus }: { orderId: string; inventoryStatus: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const actions = inventoryStatus === "RETURN_EXPECTED"
    ? [{ action: "receive", label: "Receive return" }]
    : inventoryStatus === "INSPECTION"
      ? [{ action: "restock", label: "Approve for resale" }, { action: "quarantine", label: "Quarantine device" }]
      : [];

  if (!actions.length) return null;

  async function submit(action: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/returns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Return update failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return update failed.");
    } finally { setBusy(false); }
  }

  return <div style={{ marginTop: 10 }}>
    <p><strong>Return workflow</strong> · {inventoryStatus.replaceAll("_", " ")}</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {actions.map(({ action, label }) => <button key={action} type="button" disabled={busy} onClick={() => submit(action)}>{busy ? "Updating…" : label}</button>)}
    </div>
    {error ? <p style={{ marginTop: 8 }}>{error}</p> : null}
  </div>;
}
