
"use client";

import { useState } from "react";

const basePrices: Record<string, number> = {
  "iPhone 15 Pro": 450,
  "iPhone 14 Pro": 320,
  "iPhone 13": 190,
  "Samsung Galaxy S24": 360,
};

export default function SellPage() {
  const [model, setModel] = useState("iPhone 15 Pro");
  const [storage, setStorage] = useState("128GB");
  const [condition, setCondition] = useState("Good");
  const [battery, setBattery] = useState("85-89%");
  const [offer, setOffer] = useState<number | null>(null);

  function calculateOffer() {
    const base = basePrices[model] ?? 0;
    const storageBonus =
      storage === "512GB" ? 60 : storage === "256GB" ? 30 : 0;
    const conditionAdjustment =
      condition === "Excellent" ? 0 :
      condition === "Good" ? -40 :
      condition === "Fair" ? -100 : -180;
    const batteryAdjustment =
      battery === "90%+" ? 0 :
      battery === "85-89%" ? -20 :
      battery === "80-84%" ? -45 : -90;

    setOffer(Math.max(0, base + storageBonus +
      conditionAdjustment + batteryAdjustment));
  }

  return (
    <main className="section">
      <p className="eyebrow">SELL YOUR PHONE</p>
      <h1 className="pageTitle">Get an Instant Offer</h1>
      <p>
        Sell your used phone directly to Btech Market.
        Get an estimated purchase offer in seconds.
      </p>

      <div style={{ maxWidth: 520, display: "grid", gap: 16, marginTop: 28 }}>
        <label>
          Phone model
          <select value={model} onChange={(e) => { setModel(e.target.value); setOffer(null); }}>
            {Object.keys(basePrices).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>

        <label>
          Storage
          <select value={storage} onChange={(e) => { setStorage(e.target.value); setOffer(null); }}>
            {["128GB", "256GB", "512GB"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>

        <label>
          Physical condition
          <select value={condition} onChange={(e) => { setCondition(e.target.value); setOffer(null); }}>
            {["Excellent", "Good", "Fair", "Poor"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>

        <label>
          Battery health
          <select value={battery} onChange={(e) => { setBattery(e.target.value); setOffer(null); }}>
            {["90%+", "85-89%", "80-84%", "Below 80%"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>

        <button type="button" onClick={calculateOffer}
          style={{ padding: 14, cursor: "pointer", borderRadius: 8 }}>
          Get My Offer
        </button>

        {offer !== null && (
          <div style={{ padding: 24, border: "1px solid #aaa", borderRadius: 12 }}>
            <p>Your estimated Btech Market offer</p>
            <h2>${offer.toFixed(2)} CAD</h2>
            <p>
              Illustrative estimate only. Final pricing is subject
              to device verification, inspection and approval.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
