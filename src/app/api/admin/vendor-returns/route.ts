import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

type Body = {
  vendorReturnId?: string;
  action?: "ship" | "receive" | "close";
  carrier?: string;
  trackingNumber?: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.vendorReturnId || !body.action) {
    return NextResponse.json({ error: "Vendor return and action are required." }, { status: 400 });
  }

  const vendorReturn = await db.vendorReturn.findUnique({ where: { id: body.vendorReturnId } });
  if (!vendorReturn) return NextResponse.json({ error: "Vendor return not found." }, { status: 404 });

  if (body.action === "ship") {
    const carrier = body.carrier?.trim();
    const trackingNumber = body.trackingNumber?.trim();
    if (vendorReturn.status !== "READY_TO_SHIP") {
      return NextResponse.json({ error: "Vendor return is not ready to ship." }, { status: 409 });
    }
    if (!carrier || !trackingNumber) {
      return NextResponse.json({ error: "Carrier and tracking number are required." }, { status: 400 });
    }
    await db.vendorReturn.update({
      where: { id: vendorReturn.id },
      data: { status: "SHIPPED", carrier, trackingNumber, shippedAt: new Date() },
    });
    return NextResponse.json({ ok: true, status: "SHIPPED" });
  }

  if (body.action === "receive") {
    if (vendorReturn.status !== "SHIPPED") {
      return NextResponse.json({ error: "Vendor return must be shipped before receipt." }, { status: 409 });
    }
    await db.vendorReturn.update({
      where: { id: vendorReturn.id },
      data: { status: "RECEIVED_BY_VENDOR", receivedAt: new Date() },
    });
    return NextResponse.json({ ok: true, status: "RECEIVED_BY_VENDOR" });
  }

  if (body.action === "close") {
    if (vendorReturn.status !== "RECEIVED_BY_VENDOR") {
      return NextResponse.json({ error: "Vendor must receive the device before the return can close." }, { status: 409 });
    }
    await db.vendorReturn.update({
      where: { id: vendorReturn.id },
      data: { status: "CLOSED" },
    });
    return NextResponse.json({ ok: true, status: "CLOSED" });
  }

  return NextResponse.json({ error: "Unsupported vendor return action." }, { status: 400 });
}
