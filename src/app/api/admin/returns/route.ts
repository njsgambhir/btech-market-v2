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
    include: { lines: { include: { inventory: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "REFUNDED") return NextResponse.json({ error: "Only refunded orders can enter return inspection." }, { status: 409 });

  const statuses = order.lines.flatMap((line) => line.inventory.map((unit) => unit.status));

  if (body.action === "receive") {
    if (!statuses.some((status) => status === "RETURN_EXPECTED")) return NextResponse.json({ error: "No returned device is awaiting receipt." }, { status: 409 });
    await db.$transaction([
      db.inventoryUnit.updateMany({ where: { orderLine: { orderId: order.id }, status: "RETURN_EXPECTED" }, data: { status: "INSPECTION" } }),
      db.order.update({ where: { id: order.id }, data: { returnReceivedAt: new Date() } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "restock" || body.action === "quarantine") {
    if (!statuses.some((status) => status === "INSPECTION")) return NextResponse.json({ error: "Returned device must be received before inspection is completed." }, { status: 409 });
    const status = body.action === "restock" ? "AVAILABLE" : "QUARANTINED";
    await db.$transaction([
      db.inventoryUnit.updateMany({ where: { orderLine: { orderId: order.id }, status: "INSPECTION" }, data: { status, orderLineId: null, reservedUntil: null } }),
      db.order.update({ where: { id: order.id }, data: { returnInspectedAt: new Date() } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported return action." }, { status: 400 });
}
