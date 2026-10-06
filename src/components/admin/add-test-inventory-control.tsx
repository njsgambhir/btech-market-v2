"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddTestInventoryControl({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function addUnit() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/inventory/test-unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Test inventory could not be added.");
        return;
      }
      setMessage(`Test unit added: ${data.serialNumber}`);
      router.refresh();
    } catch {
      setMessage("Test inventory could not be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" onClick={addUnit} disabled={busy}>
        {busy ? "Adding…" : "Add test unit (Preview)"}
      </button>
      {message ? <p style={{ marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
