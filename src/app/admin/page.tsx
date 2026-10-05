import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/account");
  if (session.user.role !== "ADMIN") redirect("/account");

  const [users, sellers, listings, orders, recentOrders, recentSellers] = await Promise.all([
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
        <div className="statCard"><span>Active listings</span><strong>{listings}</strong></div>
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
                  <strong>Order # {order.orderNumber}</strong> · {money.format(order.totalCents / 100)} · {order.status}
                </p>
                <p>
                  {order.lines.map((line) => line.listing.variant.model.name).join(", ")}
                  {order.trackingNumber ? ` · Tracking ${order.carrier ?? ""} ${order.trackingNumber}` : ""}
                </p>
                <Link href={`/order-confirmation?order=${order.orderNumber}`}>View order</Link>
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
                <p><strong>{seller.displayName}</strong> · {seller.verified ? "Verified" : "Pending verification"}</p>
                <p>{seller.user.email} · {seller._count.listings} listings</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Next admin modules</h2>
        <p>Seller approvals, inventory oversight, returns, refunds and payouts will be added to this workspace.</p>
      </section>
    </main>
  );
}
