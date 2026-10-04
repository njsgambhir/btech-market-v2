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

  const updated = await db.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
  });

  await notifyBuyer({ event: "ORDER_DELIVERED", orderId: updated.id, email: updated.email });
  return updated;
}
