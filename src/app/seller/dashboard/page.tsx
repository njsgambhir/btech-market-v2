import { db } from "@/lib/db";
import { SellerFulfillmentControls } from "@/components/seller/seller-fulfillment-controls";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/account");
  if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") redirect("/account");

  const [activeListings, availableUnits, openOrders, recentOrders] = await Promise.all([
    db.sellerListing.count({ where: { status: "ACTIVE" } }),
    db.inventoryUnit.count({ where: { status: "AVAILABLE" } }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED"] } } }),
    db.order.findMany({
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      orderBy: { updatedAt: "desc" }, take: 8,
      include: { lines: { include: { listing: { include: { variant: { include: { model: true } } } } } } },
    }),
  ]);
  const stats = [["Active listings", String(activeListings)], ["Available units", String(availableUnits)], ["Open orders", String(openOrders)], ["Pending payout", "—"]];
  return <main className="section">
    <p className="eyebrow">SELLER CENTER / PREVIEW</p>
    <div className="dashboardTitle"><h1 className="pageTitle">Dashboard</h1><a className="button primary" href="/seller/listings/new">Add product</a></div>
    <div className="statGrid">{stats.map(([label,value]) => <div className="statCard" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <section className="panel"><p className="eyebrow">ORDER MANAGEMENT</p><h2>Recent marketplace orders</h2>
      {!recentOrders.length ? <p>No marketplace orders yet.</p> : recentOrders.map((order) => <article key={order.id} style={{borderTop:"1px solid #ddd",padding:"18px 0"}}>
        <div style={{display:"flex",gap:"32px",alignItems:"baseline",flexWrap:"wrap"}}><strong>Order # {order.id.slice(-8).toUpperCase()}</strong><span>{order.status.replaceAll("_"," ")}</span><span>{"US$" + (order.totalCents / 100).toLocaleString()}</span></div>
        <p>{order.firstName} {order.lastName} · {order.city}, {order.country}</p>
        {order.lines.map((line) => <p key={line.id}><strong>{line.listing.variant.model.name}</strong> · {line.listing.variant.storage} · {line.listing.variant.color} × {line.quantity}</p>)}
        {order.trackingNumber ? <p>Tracking: {order.carrier} · {order.trackingNumber}</p> : null}
        {(order.status === "PAID" || order.status === "PROCESSING" || order.status === "SHIPPED") ? <SellerFulfillmentControls orderId={order.id} status={order.status} /> : null}
      </article>)}
    </section>
  </main>;
}
