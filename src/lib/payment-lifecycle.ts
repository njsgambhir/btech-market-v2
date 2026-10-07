import { InventoryStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyBuyer } from "@/lib/notification-events";

export async function markPaymentSucceeded(paymentId: string, providerPaymentId?: string) {
  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            lines: { include: { inventory: true, listing: { select: { sellerId: true } } } },
          },
        },
      },
    });

    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    // Webhooks may be delivered more than once. A completed payment is idempotent.
    if (payment.status === PaymentStatus.SUCCEEDED) {
      return {
        completed: payment,
        email: payment.order.email,
        orderId: payment.orderId,
        shouldNotify: false,
      };
    }

    if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new Error("ORDER_NOT_PAYABLE");
    }

    if (payment.amountCents !== payment.order.totalCents || payment.currency !== "USD") {
      throw new Error("PAYMENT_AMOUNT_MISMATCH");
    }

    const units = payment.order.lines.flatMap((line) => line.inventory);
    if (!units.length || units.some((unit) => unit.status !== InventoryStatus.RESERVED)) {
      throw new Error("INVENTORY_NOT_RESERVED");
    }

    const now = new Date();
    if (units.some((unit) => !unit.reservedUntil || unit.reservedUntil <= now)) {
      throw new Error("RESERVATION_EXPIRED");
    }

    await tx.inventoryUnit.updateMany({
      where: { id: { in: units.map((unit) => unit.id) }, status: InventoryStatus.RESERVED },
      data: { status: InventoryStatus.SOLD, reservedUntil: null },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAID },
    });

    // Split the paid order into one fulfillment unit per seller.
    const sellerGroups = new Map<string, { lineIds: string[]; subtotalCents: number }>();
    for (const line of payment.order.lines) {
      const sellerId = line.listing.sellerId;
      const group = sellerGroups.get(sellerId) ?? { lineIds: [], subtotalCents: 0 };
      group.lineIds.push(line.id);
      group.subtotalCents += line.unitPriceCents * line.quantity;
      sellerGroups.set(sellerId, group);
    }

    for (const [sellerId, group] of sellerGroups) {
      const suborder = await tx.sellerSuborder.upsert({
        where: { orderId_sellerId: { orderId: payment.orderId, sellerId } },
        update: {},
        create: { orderId: payment.orderId, sellerId, status: "PAID", subtotalCents: group.subtotalCents, currency: payment.currency },
        select: { id: true },
      });
      await tx.orderLine.updateMany({
        where: { id: { in: group.lineIds }, sellerSuborderId: null },
        data: { sellerSuborderId: suborder.id },
      });
    }

    // Snapshot the marketplace economics at the time of sale.
    // Future settings changes must not rewrite historical seller proceeds.
    const settings = await tx.marketplaceSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", defaultCommissionBps: 600, reserveDays: 7 },
    });

    for (const line of payment.order.lines) {
      const existingCredit = await tx.sellerLedgerEntry.findFirst({
        where: { orderLineId: line.id, type: "SALE_CREDIT" },
        select: { id: true },
      });
      if (!existingCredit) {
        const grossAmountCents = line.unitPriceCents * line.quantity;
        const commissionAmountCents = Math.round(
          (grossAmountCents * settings.defaultCommissionBps) / 10000,
        );
        const sellerProceedsCents = grossAmountCents - commissionAmountCents;

        await tx.sellerLedgerEntry.create({
          data: {
            sellerId: line.listing.sellerId,
            orderLineId: line.id,
            type: "SALE_CREDIT",
            status: "PENDING",
            amountCents: sellerProceedsCents,
            grossAmountCents,
            commissionAmountCents,
            commissionBps: settings.defaultCommissionBps,
            reserveDays: settings.reserveDays,
            currency: payment.currency,
            note: "Vendor net proceeds recorded after Btech marketplace commission.",
          },
        });
      }
    }

    const completed = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
        failureCode: null,
        failureMessage: null,
      },
    });

    return {
      completed,
      email: payment.order.email,
      orderId: payment.orderId,
      shouldNotify: true,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (result.shouldNotify) {
    await notifyBuyer({ event: "PAYMENT_RECEIVED", orderId: result.orderId, email: result.email });
  }
  return result.completed;
}

export async function markPaymentFailed(
  paymentId: string,
  failureCode?: string,
  failureMessage?: string,
) {
  return db.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.FAILED,
      failureCode,
      failureMessage,
    },
  });
}
