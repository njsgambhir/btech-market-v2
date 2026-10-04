import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OrderConfirmation({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  if (!orderId) notFound();

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
        <h2>Order {order.id.slice(-8).toUpperCase()}</h2>
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
        <p><strong>Delivery to</strong><br />{order.address}<br />{order.city}, {order.postalCode}<br />{order.country}</p>
        <a className="button primary" href="/shop">Continue shopping</a>
      </section>
    </main>
  );
}
