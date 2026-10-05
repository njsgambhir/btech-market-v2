import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const allowedStatuses = ["AVAILABLE", "RESERVED", "RETURNED"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const status = String(body.status ?? "");

  if (!allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
    return NextResponse.json({ error: "Unsupported inventory status." }, { status: 400 });
  }

  const unit = await db.inventoryUnit.findUnique({
    where: { id },
    select: { id: true, status: true, orderLineId: true },
  });
  if (!unit) {
    return NextResponse.json({ error: "Inventory unit not found." }, { status: 404 });
  }
  if (unit.status === "SOLD") {
    return NextResponse.json(
      { error: "Sold inventory is locked to its order and cannot be manually changed." },
      { status: 409 },
    );
  }
  if (status === "AVAILABLE" && unit.orderLineId) {
    return NextResponse.json(
      { error: "Inventory attached to an order cannot be manually made available." },
      { status: 409 },
    );
  }

  const updated = await db.inventoryUnit.update({
    where: { id },
    data: {
      status: status as "AVAILABLE" | "RESERVED" | "RETURNED",
      reservedUntil: status === "RESERVED" ? new Date(Date.now() + 15 * 60 * 1000) : null,
    },
    select: { id: true, status: true, reservedUntil: true },
  });

  return NextResponse.json({ inventory: updated });
}
