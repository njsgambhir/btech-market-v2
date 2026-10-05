"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SellerStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

export function SellerStatusControl({ sellerId, status }: { sellerId: string; status: SellerStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(nextStatus: SellerStatus) {
    setBusy(true); setError("");
    const response = await fetch("/api/admin/sellers/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, status: nextStatus }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Unable to update seller.");
    else router.refresh();
    setBusy(false);
  }

  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {status !== "APPROVED" ? <button className="button" type="button" disabled={busy} onClick={() => setStatus("APPROVED")}>Approve</button> : null}
    {status !== "PENDING" ? <button className="button" type="button" disabled={busy} onClick={() => setStatus("PENDING")}>Set pending</button> : null}
    {status !== "SUSPENDED" ? <button className="button" type="button" disabled={busy} onClick={() => setStatus("SUSPENDED")}>Suspend</button> : null}
    {status !== "REJECTED" ? <button className="button" type="button" disabled={busy} onClick={() => setStatus("REJECTED")}>Reject</button> : null}
    {error ? <p>{error}</p> : null}
  </div>;
}
