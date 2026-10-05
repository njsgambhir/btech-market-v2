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
    include: { payments: true, lines: { include: { inventory: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (body.action === "cancel") {
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: "Only unpaid orders can be cancelled here." }, { status: 409 });
    }
    await db.$transaction(async (tx) => {
      await tx.inventoryUnit.updateMany({
        where: { orderLine: { orderId: order.id }, status: "RESERVED" },
        data: { status: "AVAILABLE", orderLineId: null, reservedUntil: null },
      });
      await tx.payment.updateMany({
        where: { orderId: order.id, status: { in: ["PENDING", "PROCESSING"] } },
        data: { status: "CANCELLED" },
      });
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    });
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  if (body.action === "refund") {
    if (!["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
      return NextResponse.json({ error: "This order is not eligible for a refund." }, { status: 409 });
    }
    const succeededPayment = order.payments.find((payment) => payment.status === "SUCCEEDED");
    if (!succeededPayment) return NextResponse.json({ error: "No successful payment found." }, { status: 409 });

    // Development lifecycle only: a real payment provider refund must be completed before
    // this transition is used in production.
    await db.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "SUCCEEDED" },
        data: { status: "REFUNDED" },
      });
      await tx.inventoryUnit.updateMany({
        where: { orderLine: { orderId: order.id }, status: "SOLD" },
        data: { status: "RETURNED" },
      });
      await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
    });
    return NextResponse.json({ ok: true, status: "REFUNDED" });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
