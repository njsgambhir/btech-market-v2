import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSellerSettlementSummary, refreshEligibleSellerCredits } from "@/lib/seller-payout-lifecycle";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function SellerCenterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/account");
  if (session.user.role !== "SELLER") redirect("/account");

  const seller = await db.seller.findUnique({
    where: { userId: session.user.id },
    include: {
      listings: {
        orderBy: { updatedAt: "desc" },
        include: {
          variant: { include: { model: true } },
          inventory: { select: { status: true } },
        },
      },
    },
  });

  if (!seller) redirect("/account");

  await refreshEligibleSellerCredits();
  const settlement = await getSellerSettlementSummary(seller.id);

  const orderLines = await db.orderLine.findMany({
    where: { listing: { sellerId: seller.id } },
    orderBy: { order: { createdAt: "desc" } },
    take: 20,
    include: {
      order: true,
      listing: { include: { variant: { include: { model: true } } } },
      inventory: { select: { status: true } },
    },
  });

  const availableUnits = seller.listings.reduce(
    (total, listing) => total + listing.inventory.filter((unit) => unit.status === "AVAILABLE").length,
    0,
  );

  return (
    <main className="section">
      <p className="eyebrow">BTECH SELLER CENTER</p>
      <h1 className="pageTitle">{seller.displayName}</h1>
      <p className="lede">
        Seller status: <strong>{seller.status.replaceAll("_", " ")}</strong>. Manage marketplace inventory,
        orders and settlement activity from your seller workspace.
      </p>

      {seller.status !== "APPROVED" ? (
        <section className="panel">
          <h2>Seller account review</h2>
          <p>Your seller workspace is available for review, but fulfillment actions require an approved seller account.</p>
        </section>
      ) : null}

      <div className="statGrid">
        <div className="statCard"><span>Listings</span><strong>{seller.listings.length}</strong></div>
        <div className="statCard"><span>Available units</span><strong>{availableUnits}</strong></div>
        <div className="statCard"><span>Pending reserve</span><strong>{money.format(settlement.pendingCents / 100)}</strong></div>
        <div className="statCard"><span>Available payout</span><strong>{money.format(settlement.availableCents / 100)}</strong></div>
      </div>

      <section className="panel">
        <h2>Orders for your listings</h2>
        {!orderLines.length ? <p>No seller orders yet.</p> : orderLines.map((line) => (
          <article key={line.id} style={{ padding: "16px 0", borderTop: "1px solid #e5e5e5" }}>
            <p>
              <strong>Order # {line.order.id.slice(-8).toUpperCase()}</strong> · {line.order.status.replaceAll("_", " ")}
            </p>
            <p>
              {line.listing.variant.model.name} · {line.listing.variant.storage} · {line.listing.variant.color} ·
              {" "}{money.format(line.unitPriceCents / 100)} × {line.quantity}
            </p>
            <p>
              Inventory: {line.inventory.map((unit) => unit.status.replaceAll("_", " ")).join(", ") || "Not assigned"}
              {line.order.trackingNumber ? ` · Tracking ${line.order.carrier ?? ""} ${line.order.trackingNumber}` : ""}
            </p>
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>Your listings</h2>
        {!seller.listings.length ? <p>No listings yet.</p> : seller.listings.map((listing) => {
          const available = listing.inventory.filter((unit) => unit.status === "AVAILABLE").length;
          return (
            <article key={listing.id} style={{ padding: "16px 0", borderTop: "1px solid #e5e5e5" }}>
              <p><strong>{listing.variant.model.name}</strong> · {listing.variant.storage} · {listing.variant.color}</p>
              <p>{listing.status.replaceAll("_", " ")} · {money.format(listing.priceCents / 100)} · {available} available</p>
            </article>
          );
        })}
      </section>

      <section className="panel">
        <h2>Settlement summary</h2>
        <p>Pending reserve: {money.format(settlement.pendingCents / 100)}</p>
        <p>Available for payout: {money.format(settlement.availableCents / 100)}</p>
        <p>Paid to date: {money.format(settlement.paidCents / 100)}</p>
      </section>
    </main>
  );
}
