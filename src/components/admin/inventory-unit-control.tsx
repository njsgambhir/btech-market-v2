"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InventoryStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "RETURNED";

export function InventoryUnitControl({
  inventoryUnitId,
  status,
}: {
  inventoryUnitId: string;
  status: InventoryStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: InventoryStatus) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/inventory/${inventoryUnitId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to update inventory.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update inventory.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {status !== "AVAILABLE" && status !== "SOLD" && (
          <button disabled={busy} onClick={() => updateStatus("AVAILABLE")}>Mark available</button>
        )}
        {status === "AVAILABLE" && (
          <button disabled={busy} onClick={() => updateStatus("RESERVED")}>Reserve</button>
        )}
        {status !== "RETURNED" && status !== "SOLD" && (
          <button disabled={busy} onClick={() => updateStatus("RETURNED")}>Mark returned</button>
        )}
      </div>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </div>
  );
}
