"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReturnStatus = "REQUESTED" | "AUTHORIZED" | "IN_TRANSIT" | "RECEIVED" | "APPROVED" | "REJECTED" | "REFUNDED" | null;

export function ReturnInspectionControl({
  orderId,
  orderStatus,
  returnStatus,
}: {
  orderId: string;
  orderStatus: string;
  returnStatus: ReturnStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [currentReturnStatus, setCurrentReturnStatus] = useState<ReturnStatus>(returnStatus);

  const actions =
    orderStatus === "DELIVERED" && !currentReturnStatus ? [{ action: "request", label: "Start return" }] :
    currentReturnStatus === "REQUESTED" ? [{ action: "authorize", label: "Authorize return" }] :
    currentReturnStatus === "AUTHORIZED" || currentReturnStatus === "IN_TRANSIT" ? [{ action: "receive", label: "Receive returned phone" }] :
    currentReturnStatus === "RECEIVED" ? [
      { action: "approve", label: "Pass inspection" },
      { action: "reject", label: "Fail inspection" },
    ] :
    currentReturnStatus === "APPROVED" ? [{ action: "refund", label: "Issue refund" }] : [];

  if (!actions.length && !currentReturnStatus) return null;

  async function submit(action: string) {
    if (action === "refund" && !window.confirm("Issue the refund now that the returned phone has passed inspection?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Return update failed.");
      if (data.returnStatus) setCurrentReturnStatus(data.returnStatus as ReturnStatus);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return update failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div style={{ marginTop: 10 }}>
    <p><strong>Return</strong> · {(currentReturnStatus ?? "NOT STARTED").replaceAll("_", " ")}</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {actions.map(({ action, label }) => (
        <button key={action} type="button" disabled={busy} onClick={() => submit(action)}>
          {busy ? "Updating…" : label}
        </button>
      ))}
    </div>
    {currentReturnStatus === "REJECTED" ? <p>Refund locked. Device is quarantined for manual resolution.</p> : null}
    {error ? <p style={{ marginTop: 8, color: "#b00020", fontWeight: 600 }}>Return update failed: {error}</p> : null}
  </div>;
}
