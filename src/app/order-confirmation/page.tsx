import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { expirePendingReservations } from "@/lib/order-lifecycle";
import { TestPaymentButton } from "@/components/payments/test-payment-button";
import { TestFulfillmentControls } from "@/components/fulfillment/test-fulfillment-controls";

export const dynamic = "force-dynamic";

export default async function OrderConfirmation({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  if (!orderId) notFound();

  const session = await auth();
  await expirePendingReservations();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      lines: {
        include: {
          listing: { include: { variant: { include: { model: true } } } },
          inventory: true,
        },
      },
      sellerSuborders: {
        orderBy: { createdAt: "asc" },
        include: {
          seller: { select: { displayName: true } },
          lines: { include: { listing: { include: { variant: { include: { model: true } } } } } },
        },
      },
    },
  });
  if (!order) notFound();

  // Signed-in customers may only view their own order. In Preview only, admins
  // may inspect test customer orders without changing their permanent role.
  const isAdminTest = session?.user?.role === "ADMIN" && process.env.VERCEL_ENV !== "production";
  if (session?.user?.id && order.customerId !== session.user.id && !isAdminTest) notFound();

  const reservedUntil = order.lines
    .flatMap((line) => line.inventory)
    .map((unit) => unit.reservedUntil)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <main className="section narrowPage">
      <p className="eyebrow">{order.status === "PAID" ? "ORDER CONFIRMED" : "ORDER RESERVED"}</p>
      <h1 className="pageTitle">Thank you, {order.firstName}.</h1>
      <section className="panel">
        <h2>Order # {order.id.slice(-8).toUpperCase()}</h2>
        {order.status === "PENDING_PAYMENT" ? (
          <p>
            Your order has been created. No payment has been charged.
            {reservedUntil ? <> Inventory is reserved until {reservedUntil.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</> : null}
          </p>
        ) : null}
        {order.lines.map((line) => (
          <div className="cartLine" key={line.id}>
            <div>
              <strong>{line.listing.variant.model.name}</strong>
              <p>{line.listing.variant.storage} · {line.listing.variant.color} × {line.quantity}</p>
            </div>
            <strong>{ "US$" + ((line.unitPriceCents * line.quantity) / 100).toLocaleString() }</strong>
          </div>
        ))}
        <div className="summaryCard" style={{ marginTop: "24px" }}>
          <div className="summaryTotal">
            <span>Order subtotal</span>
            <strong>{ "US$" + (order.totalCents / 100).toLocaleString() }</strong>
          </div>
        </div>
        {order.sellerSuborders.length ? (
          <section style={{ marginTop: "24px" }}>
            <h3>Shipments</h3>
            {order.sellerSuborders.map((suborder) => (
              <div style={{ marginTop: "8px", padding: "18px 20px", border: "1px solid #e5e7eb", display: "grid", gap: "7px" }} key={suborder.id}>
                <p style={{ margin: 0 }}><strong>{suborder.seller.displayName}</strong> · {suborder.status.replaceAll("_", " ")}</p>
                {suborder.lines.map((line) => (
                  <p style={{ margin: 0 }} key={line.id}>{line.listing.variant.model.name} · {line.listing.variant.storage} · {line.listing.variant.color} × {line.quantity}</p>
                ))}
                {suborder.trackingNumber ? <p style={{ margin: 0 }}>Tracking: {suborder.carrier ?? ""} {suborder.trackingNumber}</p> : null}
                {suborder.status === "DELIVERED" && suborder.deliveredAt ? <p style={{ margin: 0 }}>Delivered {suborder.deliveredAt.toLocaleDateString()}</p> : null}
              </div>
            ))}
          </section>
        ) : null}
        {order.status === "PENDING_PAYMENT" && (session?.user?.id === order.customerId || isAdminTest) ? <TestPaymentButton orderId={order.id} /> : null}
        {order.status === "PAID" ? <p><strong>Payment received.</strong> Your order is confirmed and the device has been allocated to your order.</p> : null}
        {order.status === "PROCESSING" ? <p><strong>Processing.</strong> Your order is being prepared for shipment.</p> : null}
        {order.status === "SHIPPED" ? <p><strong>Shipped.</strong> {order.carrier} tracking: {order.trackingNumber}</p> : null}
        {order.status === "DELIVERED" ? <p><strong>Delivered.</strong> Your order has been delivered.</p> : null}
        {session?.user?.id === order.customerId && (order.status === "PAID" || order.status === "PROCESSING" || order.status === "SHIPPED") ? (
          <TestFulfillmentControls orderId={order.id} status={order.status} />
        ) : null}
        <p><strong>Delivery to</strong><br />{order.address}<br />{order.city}, {order.postalCode}<br />{order.country}</p>
        <a className="button primary" href="/shop">Continue shopping</a>
      </section>
    </main>
  );
}
