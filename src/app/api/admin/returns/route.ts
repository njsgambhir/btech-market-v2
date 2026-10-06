import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as { orderId?: string; action?: string } | null;
  if (!body?.orderId || !body.action) return NextResponse.json({ error: "Order and action are required." }, { status: 400 });

  const order = await db.order.findUnique({
    where: { id: body.orderId },
    include: { payments: true, lines: { include: { inventory: true, listing: { select: { sellerId: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const statuses = order.lines.flatMap((line) => line.inventory.map((unit) => unit.status));

  if (body.action === "request") {
    if (order.status !== "DELIVERED" || order.returnStatus) {
      return NextResponse.json({ error: "Only delivered orders without an existing return can start a return." }, { status: 409 });
    }
    await db.order.update({
      where: { id: order.id },
      data: { returnStatus: "REQUESTED", returnRequestedAt: new Date() },
    });
    return NextResponse.json({ ok: true, returnStatus: "REQUESTED" });
  }

  if (body.action === "authorize") {
    if (order.returnStatus !== "REQUESTED") return NextResponse.json({ error: "Return must be requested before authorization." }, { status: 409 });
    await db.order.update({
      where: { id: order.id },
      data: { returnStatus: "AUTHORIZED", returnAuthorizedAt: new Date() },
    });
    return NextResponse.json({ ok: true, returnStatus: "AUTHORIZED" });
  }

  if (body.action === "receive") {
    if (!["AUTHORIZED", "IN_TRANSIT"].includes(order.returnStatus ?? "")) {
      return NextResponse.json({ error: "Return must be authorized before it can be received." }, { status: 409 });
    }
    if (!statuses.some((status) => status === "SOLD")) {
      return NextResponse.json({ error: "No sold inventory is attached to this return." }, { status: 409 });
    }
    await db.$transaction([
      db.inventoryUnit.updateMany({
        where: { orderLine: { orderId: order.id }, status: "SOLD" },
        data: { status: "INSPECTION" },
      }),
      db.order.update({
        where: { id: order.id },
        data: { returnStatus: "RECEIVED", returnReceivedAt: new Date() },
      }),
    ]);
    return NextResponse.json({ ok: true, returnStatus: "RECEIVED" });
  }

  if (body.action === "approve") {
    if (order.returnStatus !== "RECEIVED" || !statuses.some((status) => status === "INSPECTION")) {
      return NextResponse.json({ error: "Returned device must be received before inspection approval." }, { status: 409 });
    }
    await db.$transaction([
      db.inventoryUnit.updateMany({
        where: { orderLine: { orderId: order.id }, status: "INSPECTION" },
        data: { status: "RETURNED" },
      }),
      db.order.update({
        where: { id: order.id },
        data: { returnStatus: "APPROVED", returnInspectedAt: new Date() },
      }),
    ]);
    return NextResponse.json({ ok: true, returnStatus: "APPROVED" });
  }

  if (body.action === "reject") {
    if (order.returnStatus !== "RECEIVED" || !statuses.some((status) => status === "INSPECTION")) {
      return NextResponse.json({ error: "Returned device must be received before inspection rejection." }, { status: 409 });
    }
    await db.$transaction([
      db.inventoryUnit.updateMany({
        where: { orderLine: { orderId: order.id }, status: "INSPECTION" },
        data: { status: "QUARANTINED" },
      }),
      db.order.update({
        where: { id: order.id },
        data: { returnStatus: "REJECTED", returnInspectedAt: new Date() },
      }),
    ]);
    return NextResponse.json({ ok: true, returnStatus: "REJECTED" });
  }

  if (body.action === "refund") {
    if (order.returnStatus !== "APPROVED") {
      return NextResponse.json({ error: "Refund is locked until the returned device passes inspection." }, { status: 409 });
    }
    const payment = order.payments.find((item) => item.status === "SUCCEEDED");
    if (!payment) return NextResponse.json({ error: "No successful payment found for this order." }, { status: 409 });

    // Development payment lifecycle: replace with provider refund confirmation before production.
    await db.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "SUCCEEDED" },
        data: { status: "REFUNDED" },
      });
      await tx.inventoryUnit.updateMany({
        where: { orderLine: { orderId: order.id }, status: "RETURNED" },
        data: { status: "RETURNED", reservedUntil: null },
      });

      for (const line of order.lines) {
        const sellerId = line.listing.sellerId;
        const saleCredit = await tx.sellerLedgerEntry.findFirst({
          where: { orderLineId: line.id, type: "SALE_CREDIT" },
          select: { id: true, status: true, amountCents: true },
        });
        const existingDebit = await tx.sellerLedgerEntry.findFirst({
          where: { orderLineId: line.id, type: "RETURN_DEBIT" },
          select: { id: true },
        });

        // Pending or payout-eligible proceeds have not left Btech yet, so void
        // the credit rather than creating a compensating debit. Only a SETTLED
        // credit has actually been paid to the seller and must be recovered.
        if (saleCredit && ["PENDING", "POSTED"].includes(saleCredit.status)) {
          await tx.sellerLedgerEntry.update({
            where: { id: saleCredit.id },
            data: {
              status: "VOID",
              note: "Vendor proceeds voided because the customer order was refunded before payout.",
            },
          });
        } else if (saleCredit?.status === "SETTLED" && !existingDebit) {
          await tx.sellerLedgerEntry.create({
            data: {
              sellerId,
              orderLineId: line.id,
              type: "RETURN_DEBIT",
              status: "POSTED",
              amountCents: -saleCredit.amountCents,
              currency: payment.currency,
              note: "Net seller proceeds charged back after a customer refund following payout.",
            },
          });
        } else if (!saleCredit && !existingDebit) {
          // Legacy fallback for orders created before seller-credit snapshots existed.
          await tx.sellerLedgerEntry.create({
            data: {
              sellerId,
              orderLineId: line.id,
              type: "RETURN_DEBIT",
              status: "POSTED",
              amountCents: -(line.unitPriceCents * line.quantity),
              currency: payment.currency,
              note: "Legacy customer refund charged back without a seller-credit snapshot.",
            },
          });
        }

        const existingVendorReturn = await tx.vendorReturn.findFirst({
          where: { orderLineId: line.id },
          select: { id: true },
        });
        if (!existingVendorReturn) {
          await tx.vendorReturn.create({
            data: {
              sellerId,
              orderLineId: line.id,
              status: "READY_TO_SHIP",
            },
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED", returnStatus: "REFUNDED" },
      });
    });
    return NextResponse.json({ ok: true, returnStatus: "REFUNDED" });
  }

  return NextResponse.json({ error: "Unsupported return action." }, { status: 400 });
}
