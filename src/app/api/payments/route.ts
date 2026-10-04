import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createPaymentForOrder } from "@/lib/payment-initiation";

type PaymentRequest = { orderId?: string };

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in before payment." }, { status: 401 });
  }

  let body: PaymentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }

  if (!body.orderId) {
    return NextResponse.json({ error: "Order is required." }, { status: 400 });
  }

  try {
    const payment = await createPaymentForOrder(body.orderId, session.user.id);
    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      amountCents: payment.amountCents,
      currency: payment.currency,
    }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_ERROR";
    if (code === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (code === "ORDER_NOT_PAYABLE" || code === "RESERVATION_EXPIRED") {
      return NextResponse.json({ error: "This order is no longer available for payment." }, { status: 409 });
    }
    console.error("Payment initiation failed", error);
    return NextResponse.json({ error: "Payment could not be started." }, { status: 500 });
  }
}
