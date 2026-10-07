import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSellerSettlementSummary, refreshEligibleSellerCredits } from "@/lib/seller-payout-lifecycle";
import { SellerFulfillmentControl } from "@/components/seller/seller-fulfillment-control";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function SellerCenterPage({ searchParams }: { searchParams: Promise<{ seller?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/account");
  const params = await searchParams;
  const adminPreview = session.user.role === "ADMIN" && process.env.VERCEL_ENV !== "production";
  if (session.user.role !== "SELLER" && !adminPreview) redirect("/account");

  const seller = adminPreview && params.seller
    ? await db.seller.findUnique({
        where: { id: params.seller },
        include: {
          listings: {
            orderBy: { updatedAt: "desc" },
            include: {
              variant: { include: { model: true } },
              inventory: { select: { status: true } },
            },
          },
        },
      })
    : await db.seller.findUnique({
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

  const suborders = await db.sellerSuborder.findMany({
    where: { sellerId: seller.id },
    orderBy: { order: { createdAt: "desc" } },
    take: 20,
    include: {
      order: true,
      lines: {
        include: {
          listing: { include: { variant: { include: { model: true } } } },
          inventory: { select: { status: true } },
        },
      },
    },
  });

  const availableUnits = seller.listings.reduce(
    (total, listing) => total + listing.inventory.filter((unit) => unit.status === "AVAILABLE").length,
    0,
  );

  return (
    <main className="section">
      <p className="eyebrow">BTECH SELLER CENTER</p>
      {adminPreview ? <p><strong>Preview admin test mode.</strong> You are viewing this seller workspace without changing your account role.</p> : null}
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
        {!suborders.length ? <p>No seller suborders yet. New paid orders will appear here.</p> : suborders.map((suborder) => (
          <article key={suborder.id} style={{ padding: "16px 0", borderTop: "1px solid #e5e5e5" }}>
            <p>
              <strong>Order # {suborder.order.id.slice(-8).toUpperCase()}</strong> · {suborder.status.replaceAll("_", " ")} · {money.format(suborder.subtotalCents / 100)}
            </p>
            {suborder.lines.map((line) => (
              <div key={line.id}>
                <p>
                  {line.listing.variant.model.name} · {line.listing.variant.storage} · {line.listing.variant.color} ·
                  {" "}{money.format(line.unitPriceCents / 100)} × {line.quantity}
                </p>
                <p>Inventory: {line.inventory.map((unit) => unit.status.replaceAll("_", " ")).join(", ") || "Not assigned"}</p>
              </div>
            ))}
            {suborder.trackingNumber ? <p>Tracking: {suborder.carrier ?? ""} {suborder.trackingNumber}</p> : null}
            {seller.status === "APPROVED" ? <SellerFulfillmentControl suborderId={suborder.id} status={suborder.status} /> : null}
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
