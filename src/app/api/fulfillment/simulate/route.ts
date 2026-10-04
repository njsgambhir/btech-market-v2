import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  markOrderDelivered,
  markOrderProcessing,
  markOrderShipped,
} from "@/lib/fulfillment-lifecycle";

type FulfillmentBody = {
  orderId?: string;
  action?: "processing" | "shipped" | "delivered";
  carrier?: string;
  trackingNumber?: string;
};

export async function POST(request: NextRequest) {
  // Development control only. Production fulfillment will be handled by
  // authenticated admin/seller workflows.
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: FulfillmentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.orderId || !body.action) {
    return NextResponse.json({ error: "Order and fulfillment action are required." }, { status: 400 });
  }

  try {
    if (body.action === "processing") {
      const order = await markOrderProcessing(body.orderId);
      return NextResponse.json({ order });
    }

    if (body.action === "shipped") {
      const carrier = body.carrier?.trim();
      const trackingNumber = body.trackingNumber?.trim();
      if (!carrier || !trackingNumber) {
        return NextResponse.json({ error: "Carrier and tracking number are required." }, { status: 400 });
      }
      const order = await markOrderShipped(body.orderId, carrier, trackingNumber);
      return NextResponse.json({ order });
    }

    if (body.action === "delivered") {
      const order = await markOrderDelivered(body.orderId);
      return NextResponse.json({ order });
    }

    return NextResponse.json({ error: "Unsupported fulfillment action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FULFILLMENT_FAILED";
    const status = message === "ORDER_NOT_FOUND" ? 404 : message === "INVALID_FULFILLMENT_STATE" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
