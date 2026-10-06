import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SellerStatusControl } from "@/components/admin/seller-status-control";
import { ListingStatusControl } from "@/components/admin/listing-status-control";
import { InventoryUnitControl } from "@/components/admin/inventory-unit-control";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { ReturnInspectionControl } from "@/components/admin/return-inspection-control";
import { VendorReturnControl } from "@/components/admin/vendor-return-control";
import { SellerPayoutControl } from "@/components/admin/seller-payout-control";
import { refreshEligibleSellerCredits } from "@/lib/seller-payout-lifecycle";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/account");
  if (session.user.role !== "ADMIN") redirect("/account");

  await refreshEligibleSellerCredits();

  const [users, sellers, activeListings, orders, recentOrders, recentSellers, marketplaceListings, vendorReturns, ledgerEntries, payouts] = await Promise.all([
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
            inventory: { select: { status: true } },
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
    db.vendorReturn.findMany({
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: {
        seller: true,
        orderLine: { include: { order: true, listing: { include: { variant: { include: { model: true } } } }, inventory: true } },
      },
    }),
    db.sellerLedgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { seller: true, orderLine: { include: { order: true } } },
    }),
    db.sellerPayout.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { seller: true },
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
                <OrderStatusControl orderId={order.id} status={order.status} />
                {["DELIVERED", "REFUNDED"].includes(order.status) || order.returnStatus ? (
                  <ReturnInspectionControl orderId={order.id} orderStatus={order.status} returnStatus={order.returnStatus} />
                ) : null}
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
        <h2>Seller payouts</h2>
        {recentSellers.map((seller) => {
          const sellerEntries = ledgerEntries.filter((entry) => entry.sellerId === seller.id);
          const pendingCents = sellerEntries.filter((entry) => entry.type === "SALE_CREDIT" && entry.status === "PENDING").reduce((sum, entry) => sum + entry.amountCents, 0);
          const availableCents = sellerEntries.filter((entry) => entry.status === "POSTED").reduce((sum, entry) => sum + entry.amountCents, 0);
          const paidCents = payouts.filter((payout) => payout.sellerId === seller.id && payout.status === "PAID").reduce((sum, payout) => sum + payout.amountCents, 0);
          return <div key={seller.id} style={{ padding: "16px 0", borderTop: "1px solid #e5e5e5" }}>
            <p><strong>{seller.displayName}</strong> · {seller.status}</p>
            <p>Pending reserve: {money.format(pendingCents / 100)} · Available: {money.format(availableCents / 100)} · Paid: {money.format(paidCents / 100)}</p>
            <SellerPayoutControl sellerId={seller.id} availableCents={availableCents} />
          </div>;
        })}
        {payouts.length ? <>
          <h3 style={{ marginTop: 24 }}>Recent payouts</h3>
          {payouts.map((payout) => <div key={payout.id} style={{ padding: "10px 0", borderTop: "1px dashed #ddd" }}>
            <p><strong>{payout.seller.displayName}</strong> · {money.format(payout.amountCents / 100)} · {payout.status}</p>
            <p>{payout.paidAt ? `Paid ${payout.paidAt.toLocaleString()} UTC` : "Not paid yet"} · {payout.provider}</p>
          </div>)}
        </> : null}
      </section>

      <section className="panel">
        <h2>Vendor returns & settlements</h2>
        {vendorReturns.length === 0 && ledgerEntries.length === 0 ? <p>No vendor return or settlement activity yet.</p> : (
          <div>
            {vendorReturns.map((item) => {
              const debit = ledgerEntries.find((entry) => entry.orderLineId === item.orderLineId && entry.type === "RETURN_DEBIT");
              return <div key={item.id} style={{ padding: "16px 0", borderTop: "1px solid #e5e5e5" }}>
                <p><strong>{item.seller.displayName}</strong> · {item.status.replaceAll("_", " ")}</p>
                <p>{item.orderLine.listing.variant.model.name} · Order # {item.orderLine.order.id.slice(-8).toUpperCase()}</p>
                <p>Vendor return debit: {debit ? money.format(Math.abs(debit.amountCents) / 100) : "Pending"}</p>
                <p>Return tracking: {item.trackingNumber ? `${item.carrier ?? ""} ${item.trackingNumber}` : "Not shipped to vendor yet"}</p>
                <VendorReturnControl vendorReturnId={item.id} status={item.status} />
              </div>;
            })}
            <h3 style={{ marginTop: 24 }}>Seller ledger</h3>
            {ledgerEntries.map((entry) => (
              <div key={entry.id} style={{ padding: "10px 0", borderTop: "1px dashed #ddd" }}>
                <p><strong>{entry.seller.displayName}</strong> · {entry.type.replaceAll("_", " ")} · {money.format(entry.amountCents / 100)} · {entry.status}</p>
                <p>Order # {entry.orderLine?.order.id.slice(-8).toUpperCase() ?? "—"}{entry.note ? ` · ${entry.note}` : ""}</p>
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
                  {unit.reservedUntil ? <p>Reserved until {unit.reservedUntil.toLocaleString()} UTC</p> : null}
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
