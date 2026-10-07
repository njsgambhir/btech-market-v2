import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  markOrderDelivered,
  markOrderProcessing,
  markOrderShipped,
} from "@/lib/fulfillment-lifecycle";
import {
  markSellerSuborderDelivered,
  markSellerSuborderProcessing,
  markSellerSuborderShipped,
} from "@/lib/seller-suborder-lifecycle";

type FulfillmentBody = {
  orderId?: string;
  suborderId?: string;
  action?: "processing" | "shipped" | "delivered";
  carrier?: string;
  trackingNumber?: string;
};

export async function POST(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!["SELLER", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Seller or admin access required." }, { status: 403 });
  }

  let body: FulfillmentBody;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.action) return NextResponse.json({ error: "Fulfillment action is required." }, { status: 400 });

  try {
    if (body.suborderId) {
      if (session.user.role === "SELLER") {
        const seller = await db.seller.findUnique({ where: { userId: session.user.id }, select: { id: true, status: true } });
        if (!seller || seller.status !== "APPROVED") return NextResponse.json({ error: "Approved seller account required." }, { status: 403 });
        const owned = await db.sellerSuborder.findFirst({ where: { id: body.suborderId, sellerId: seller.id }, select: { id: true } });
        if (!owned) return NextResponse.json({ error: "Suborder not available to this seller." }, { status: 403 });
      }

      if (body.action === "processing") return NextResponse.json({ suborder: await markSellerSuborderProcessing(body.suborderId) });
      if (body.action === "shipped") {
        const carrier = body.carrier?.trim();
        const trackingNumber = body.trackingNumber?.trim();
        if (!carrier || !trackingNumber) return NextResponse.json({ error: "Carrier and tracking number are required." }, { status: 400 });
        return NextResponse.json({ suborder: await markSellerSuborderShipped(body.suborderId, carrier, trackingNumber) });
      }
      if (body.action === "delivered") return NextResponse.json({ suborder: await markSellerSuborderDelivered(body.suborderId) });
    }

    if (!body.orderId) return NextResponse.json({ error: "Order or seller suborder is required." }, { status: 400 });
    if (session.user.role === "SELLER") return NextResponse.json({ error: "Seller fulfillment requires a seller suborder." }, { status: 409 });

    if (body.action === "processing") return NextResponse.json({ order: await markOrderProcessing(body.orderId) });
    if (body.action === "shipped") {
      const carrier = body.carrier?.trim();
      const trackingNumber = body.trackingNumber?.trim();
      if (!carrier || !trackingNumber) return NextResponse.json({ error: "Carrier and tracking number are required." }, { status: 400 });
      return NextResponse.json({ order: await markOrderShipped(body.orderId, carrier, trackingNumber) });
    }
    if (body.action === "delivered") return NextResponse.json({ order: await markOrderDelivered(body.orderId) });

    return NextResponse.json({ error: "Unsupported fulfillment action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FULFILLMENT_FAILED";
    const status = ["ORDER_NOT_FOUND", "SUBORDER_NOT_FOUND"].includes(message) ? 404 : message === "INVALID_FULFILLMENT_STATE" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
