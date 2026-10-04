import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { expirePendingReservationsInTransaction } from "@/lib/order-lifecycle";

export async function createPaymentForOrder(orderId: string, customerId: string) {
  return db.$transaction(async (tx) => {
    await expirePendingReservationsInTransaction(tx);

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        lines: { include: { inventory: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order || order.customerId !== customerId) throw new Error("ORDER_NOT_FOUND");
    if (order.status !== OrderStatus.PENDING_PAYMENT) throw new Error("ORDER_NOT_PAYABLE");

    const units = order.lines.flatMap((line) => line.inventory);
    if (!units.length || units.some((unit) => unit.status !== "RESERVED" || !unit.reservedUntil || unit.reservedUntil <= new Date())) {
      throw new Error("RESERVATION_EXPIRED");
    }

    const reusable = order.payments.find((payment) =>
      payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING
    );
    if (reusable) return reusable;

    return tx.payment.create({
      data: {
        orderId: order.id,
        provider: "UNASSIGNED",
        amountCents: order.totalCents,
        currency: "USD",
        status: PaymentStatus.PENDING,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
