"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderStatusControl({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const action = status === "PENDING_PAYMENT" ? "cancel" :
    ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(status) ? "refund" : null;

  if (!action) return null;

  async function submit() {
    const label = action === "refund" ? "refund this order" : "cancel this unpaid order";
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    setBusy(true); setError("");
    const response = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Order update failed.");
    else router.refresh();
    setBusy(false);
  }

  return <div style={{ marginTop: 10 }}>
    <button type="button" onClick={submit} disabled={busy}>
      {busy ? "Updating…" : action === "refund" ? "Refund order" : "Cancel order"}
    </button>
    {error ? <p style={{ marginTop: 8 }}>{error}</p> : null}
  </div>;
}
