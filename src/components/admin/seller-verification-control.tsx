"use client";

import { useState } from "react";

export function SellerVerificationControl({ sellerId, verified }: { sellerId: string; verified: boolean }) {
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(verified);
  const [error, setError] = useState("");

  async function updateVerification() {
    setBusy(true); setError("");
    const response = await fetch("/api/admin/sellers/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, verified: !current }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Unable to update seller.");
    else setCurrent(data.seller.verified);
    setBusy(false);
  }

  return <div>
    <button className="button" type="button" onClick={updateVerification} disabled={busy}>
      {busy ? "Saving…" : current ? "Remove verification" : "Verify seller"}
    </button>
    {error ? <p>{error}</p> : null}
  </div>;
}
