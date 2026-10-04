import { InventoryStatus, OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type TransactionClient = Prisma.TransactionClient;

async function expireWithClient(tx: TransactionClient, now: Date) {
  const expiredUnits = await tx.inventoryUnit.findMany({
    where: { status: InventoryStatus.RESERVED, reservedUntil: { lte: now } },
    select: { orderLine: { select: { orderId: true } } },
  });

  const orderIds = [...new Set(
    expiredUnits.flatMap((unit) => unit.orderLine?.orderId ? [unit.orderLine.orderId] : [])
  )];

  if (!orderIds.length) return { ordersCancelled: 0, unitsReleased: 0 };

  const units = await tx.inventoryUnit.updateMany({
    where: {
      status: InventoryStatus.RESERVED,
      reservedUntil: { lte: now },
      orderLine: { order: { status: OrderStatus.PENDING_PAYMENT } },
    },
    data: { status: InventoryStatus.AVAILABLE, orderLineId: null, reservedUntil: null },
  });

  const orders = await tx.order.updateMany({
    where: { id: { in: orderIds }, status: OrderStatus.PENDING_PAYMENT },
    data: { status: OrderStatus.CANCELLED },
  });

  return { ordersCancelled: orders.count, unitsReleased: units.count };
}

export async function expirePendingReservations(now = new Date()) {
  return db.$transaction(
    (tx) => expireWithClient(tx, now),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function expirePendingReservationsInTransaction(tx: TransactionClient, now = new Date()) {
  return expireWithClient(tx, now);
}
