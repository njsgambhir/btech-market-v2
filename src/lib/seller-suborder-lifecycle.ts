import { SellerSuborderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyBuyer } from "@/lib/notification-events";

async function syncParentOrder(orderId: string) {
  const suborders = await db.sellerSuborder.findMany({ where: { orderId }, select: { status: true, deliveredAt: true } });
  if (!suborders.length) return;

  if (suborders.every((item) => item.status === SellerSuborderStatus.DELIVERED)) {
    const deliveredAt = new Date();
    await db.order.update({ where: { id: orderId }, data: { status: "DELIVERED", deliveredAt } });
    return;
  }
  if (suborders.every((item) => [SellerSuborderStatus.SHIPPED, SellerSuborderStatus.DELIVERED].includes(item.status))) {
    await db.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } });
    return;
  }
  if (suborders.some((item) => item.status === SellerSuborderStatus.PROCESSING)) {
    await db.order.update({ where: { id: orderId }, data: { status: "PROCESSING" } });
  }
}

export async function markSellerSuborderProcessing(suborderId: string) {
  const suborder = await db.sellerSuborder.findUnique({ where: { id: suborderId } });
  if (!suborder) throw new Error("SUBORDER_NOT_FOUND");
  if (suborder.status === SellerSuborderStatus.PROCESSING) return suborder;
  if (suborder.status !== SellerSuborderStatus.PAID) throw new Error("INVALID_FULFILLMENT_STATE");

  const updated = await db.sellerSuborder.update({ where: { id: suborderId }, data: { status: SellerSuborderStatus.PROCESSING } });
  await syncParentOrder(updated.orderId);
  return updated;
}

export async function markSellerSuborderShipped(suborderId: string, carrier: string, trackingNumber: string) {
  const suborder = await db.sellerSuborder.findUnique({ where: { id: suborderId }, include: { order: true } });
  if (!suborder) throw new Error("SUBORDER_NOT_FOUND");
  if (suborder.status === SellerSuborderStatus.SHIPPED) return suborder;
  if (suborder.status !== SellerSuborderStatus.PROCESSING) throw new Error("INVALID_FULFILLMENT_STATE");

  const updated = await db.sellerSuborder.update({
    where: { id: suborderId },
    data: { status: SellerSuborderStatus.SHIPPED, carrier: carrier.trim(), trackingNumber: trackingNumber.trim(), shippedAt: new Date() },
  });
  await syncParentOrder(updated.orderId);
  await notifyBuyer({ event: "ORDER_SHIPPED", orderId: updated.orderId, email: suborder.order.email, carrier: updated.carrier, trackingNumber: updated.trackingNumber });
  return updated;
}

export async function markSellerSuborderDelivered(suborderId: string) {
  const suborder = await db.sellerSuborder.findUnique({ where: { id: suborderId }, include: { order: true, lines: { select: { id: true } } } });
  if (!suborder) throw new Error("SUBORDER_NOT_FOUND");
  if (suborder.status === SellerSuborderStatus.DELIVERED) return suborder;
  if (suborder.status !== SellerSuborderStatus.SHIPPED) throw new Error("INVALID_FULFILLMENT_STATE");

  const deliveredAt = new Date();
  const updated = await db.$transaction(async (tx) => {
    const delivered = await tx.sellerSuborder.update({ where: { id: suborderId }, data: { status: SellerSuborderStatus.DELIVERED, deliveredAt } });
    const credits = await tx.sellerLedgerEntry.findMany({
      where: { orderLineId: { in: suborder.lines.map((line) => line.id) }, type: "SALE_CREDIT", status: "PENDING" },
      select: { id: true, reserveDays: true },
    });
    for (const credit of credits) {
      const eligibleAt = new Date(deliveredAt);
      eligibleAt.setUTCDate(eligibleAt.getUTCDate() + (credit.reserveDays ?? 7));
      await tx.sellerLedgerEntry.update({ where: { id: credit.id }, data: { eligibleAt } });
    }
    return delivered;
  });

  await syncParentOrder(updated.orderId);
  await notifyBuyer({ event: "ORDER_DELIVERED", orderId: updated.orderId, email: suborder.order.email });
  return updated;
}
