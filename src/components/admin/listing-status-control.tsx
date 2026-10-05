"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ListingStatusControl({ listingId, status }: { listingId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status !== "ACTIVE" && status !== "PAUSED") return null;

  async function update(nextStatus: "ACTIVE" | "PAUSED") {
    setBusy(true); setError("");
    const response = await fetch("/api/admin/listings/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, status: nextStatus }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Unable to update listing.");
    else router.refresh();
    setBusy(false);
  }

  return <div>
    <button className="button" type="button" disabled={busy} onClick={() => update(status === "ACTIVE" ? "PAUSED" : "ACTIVE")}>
      {busy ? "Saving…" : status === "ACTIVE" ? "Pause listing" : "Reactivate listing"}
    </button>
    {error ? <p>{error}</p> : null}
  </div>;
}
