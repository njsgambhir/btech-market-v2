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
        },
      },
    },
  });
  if (!order) notFound();

  return (
    <main className="section narrowPage">
      <p className="eyebrow">ORDER RESERVED</p>
      <h1 className="pageTitle">Thank you, {order.firstName}.</h1>
      <section className="panel">
        <h2>Order {order.id.slice(-8).toUpperCase()}</h2>
        <p>Your development order has been created and its inventory is reserved for 15 minutes. No payment has been charged.</p>
        {order.lines.map((line) => (
          <div className="cartLine" key={line.id}>
            <div>
              <strong>{line.listing.variant.model.name}</strong>
              <p>{line.listing.variant.storage} · {line.listing.variant.color} × {line.quantity}</p>
            </div>
            <strong>{ "$" + ((line.unitPriceCents * line.quantity) / 100).toLocaleString() }</strong>
          </div>
        ))}
        <div className="summaryTotal"><span>Order subtotal</span><strong>{ "$" + (order.totalCents / 100).toLocaleString() }</strong></div>
        <p>Delivery to: {order.address}, {order.city}, {order.postalCode}, {order.country}</p>
        <a className="button primary" href="/shop">Continue shopping</a>
      </section>
    </main>
  );
}
