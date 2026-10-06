import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyBuyer } from "@/lib/notification-events";

export async function markOrderProcessing(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status === OrderStatus.PROCESSING) return order;
  if (order.status !== OrderStatus.PAID) throw new Error("INVALID_FULFILLMENT_STATE");

  const updated = await db.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.PROCESSING },
  });

  await notifyBuyer({ event: "ORDER_PROCESSING", orderId: updated.id, email: updated.email });
  return updated;
}

export async function markOrderShipped(orderId: string, carrier: string, trackingNumber: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status === OrderStatus.SHIPPED) return order;
  if (order.status !== OrderStatus.PROCESSING) throw new Error("INVALID_FULFILLMENT_STATE");

  const updated = await db.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.SHIPPED,
      carrier: carrier.trim(),
      trackingNumber: trackingNumber.trim(),
      shippedAt: new Date(),
    },
  });

  await notifyBuyer({
    event: "ORDER_SHIPPED",
    orderId: updated.id,
    email: updated.email,
    carrier: updated.carrier,
    trackingNumber: updated.trackingNumber,
  });
  return updated;
}

export async function markOrderDelivered(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status === OrderStatus.DELIVERED) return order;
  if (order.status !== OrderStatus.SHIPPED) throw new Error("INVALID_FULFILLMENT_STATE");

  const deliveredAt = new Date();
  const updated = await db.$transaction(async (tx) => {
    const delivered = await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.DELIVERED, deliveredAt },
      include: { lines: { select: { id: true } } },
    });

    const lineIds = delivered.lines.map((line) => line.id);
    if (lineIds.length) {
      const credits = await tx.sellerLedgerEntry.findMany({
        where: {
          orderLineId: { in: lineIds },
          type: "SALE_CREDIT",
          status: "PENDING",
        },
        select: { id: true, reserveDays: true },
      });

      for (const credit of credits) {
        const eligibleAt = new Date(deliveredAt);
        eligibleAt.setUTCDate(eligibleAt.getUTCDate() + (credit.reserveDays ?? 7));
        await tx.sellerLedgerEntry.update({
          where: { id: credit.id },
          data: { eligibleAt },
        });
      }
    }

    return delivered;
  });

  await notifyBuyer({ event: "ORDER_DELIVERED", orderId: updated.id, email: updated.email });
  return updated;
}
