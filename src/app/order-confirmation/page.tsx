import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { expirePendingReservations } from "@/lib/order-lifecycle";
import { TestPaymentButton } from "@/components/payments/test-payment-button";

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
    },
  });
  if (!order) notFound();

  // Signed-in customers may only view their own order confirmation.
  if (session?.user?.id && order.customerId !== session.user.id) notFound();

  const reservedUntil = order.lines
    .flatMap((line) => line.inventory)
    .map((unit) => unit.reservedUntil)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <main className="section narrowPage">
      <p className="eyebrow">ORDER RESERVED</p>
      <h1 className="pageTitle">Thank you, {order.firstName}.</h1>
      <section className="panel">
        <h2>Order # {order.id.slice(-8).toUpperCase()}</h2>
        <p>
          Your development order has been created. No payment has been charged.
          {reservedUntil ? <> Inventory is reserved until {reservedUntil.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</> : null}
        </p>
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
        {order.status === "PENDING_PAYMENT" && session?.user?.id === order.customerId ? <TestPaymentButton orderId={order.id} /> : null}
        {order.status === "PAID" ? <p><strong>Payment received.</strong> Your order is now paid and the device is allocated to this order.</p> : null}
        <p><strong>Delivery to</strong><br />{order.address}<br />{order.city}, {order.postalCode}<br />{order.country}</p>
        <a className="button primary" href="/shop">Continue shopping</a>
      </section>
    </main>
  );
}
