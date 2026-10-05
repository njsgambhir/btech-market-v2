import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SellerStatusControl } from "@/components/admin/seller-status-control";
import { ListingStatusControl } from "@/components/admin/listing-status-control";
import { InventoryUnitControl } from "@/components/admin/inventory-unit-control";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/account");
  if (session.user.role !== "ADMIN") redirect("/account");

  const [users, sellers, activeListings, orders, recentOrders, recentSellers, marketplaceListings] = await Promise.all([
    db.user.count(),
    db.seller.count(),
    db.sellerListing.count({ where: { status: "ACTIVE" } }),
    db.order.count(),
    db.order.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        lines: {
          include: {
            listing: {
              include: { variant: { include: { model: true } } },
            },
          },
        },
      },
    }),
    db.seller.findMany({
      orderBy: { displayName: "asc" },
      take: 8,
      include: {
        user: { select: { email: true } },
        _count: { select: { listings: true } },
      },
    }),
    db.sellerListing.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        seller: true,
        variant: { include: { model: true } },
        inventory: { select: { id: true, status: true, batteryHealth: true, imei: true, serialNumber: true, reservedUntil: true } },
      },
    }),
  ]);

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <main className="section">
      <p className="eyebrow">BTECH ADMIN</p>
      <h1 className="pageTitle">Marketplace operations.</h1>
      <p className="lede">Administrative oversight for customers, sellers, inventory and marketplace orders.</p>

      <div className="statGrid">
        <div className="statCard"><span>Users</span><strong>{users}</strong></div>
        <div className="statCard"><span>Sellers</span><strong>{sellers}</strong></div>
        <div className="statCard"><span>Active listings</span><strong>{activeListings}</strong></div>
        <div className="statCard"><span>Total orders</span><strong>{orders}</strong></div>
      </div>

      <section className="panel">
        <h2>Marketplace orders</h2>
        {recentOrders.length === 0 ? (
          <p>No marketplace orders yet.</p>
        ) : (
          <div>
            {recentOrders.map((order) => (
              <div key={order.id} style={{ padding: "16px 0", borderTop: "1px solid #e5e5e5" }}>
                <p>
                  <strong>Order # {order.id.slice(-8).toUpperCase()}</strong> · {money.format(order.totalCents / 100)} · {order.status}
                </p>
                <p>
                  {order.lines.map((line) => line.listing.variant.model.name).join(", ")}
                  {order.trackingNumber ? ` · Tracking ${order.carrier ?? ""} ${order.trackingNumber}` : ""}
                </p>
                <Link href={`/order-confirmation?order=${order.id}`}>View order</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Sellers</h2>
        {recentSellers.length === 0 ? (
          <p>No sellers yet.</p>
        ) : (
          <div>
            {recentSellers.map((seller) => (
              <div key={seller.id} style={{ padding: "16px 0", borderTop: "1px solid #e5e5e5" }}>
                <p><strong>{seller.displayName}</strong> · {seller.status.replaceAll("_", " ")}</p>
                <p>{seller.user.email} · {seller._count.listings} listings</p>
                <SellerStatusControl sellerId={seller.id} status={seller.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Inventory & listings</h2>
        {marketplaceListings.length === 0 ? <p>No listings yet.</p> : marketplaceListings.map((listing) => {
          const available = listing.inventory.filter((unit) => unit.status === "AVAILABLE").length;
          return <article key={listing.id} style={{ borderTop: "1px solid #ddd", padding: "18px 0" }}>
            <p><strong>{listing.variant.model.name}</strong> · {listing.variant.storage} · {listing.variant.color}</p>
            <p>{listing.seller.displayName} · {listing.status} · US${(listing.priceCents / 100).toLocaleString()}</p>
            <p>{available} available · {listing.inventory.length} total inventory units</p>
            <ListingStatusControl listingId={listing.id} status={listing.status} />
            <div style={{ marginTop: 16 }}>
              {listing.inventory.map((unit) => (
                <div key={unit.id} style={{ padding: "12px 0", borderTop: "1px dashed #ddd" }}>
                  <p><strong>Inventory unit</strong> · {unit.status}</p>
                  <p>
                    IMEI {unit.imei ?? "—"} · Serial {unit.serialNumber ?? "—"} · Battery {unit.batteryHealth ? `${unit.batteryHealth}%` : "—"}
                  </p>
                  {unit.reservedUntil ? <p>Reserved until {new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(unit.reservedUntil)} ET</p> : null}
                  <InventoryUnitControl inventoryUnitId={unit.id} status={unit.status} />
                </div>
              ))}
            </div>
          </article>;
        })}
      </section>

      <section className="panel">
        <h2>Next admin modules</h2>
        <p>Seller approvals, inventory oversight, returns, refunds and payouts will be added to this workspace.</p>
      </section>
    </main>
  );
}
