import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { markPaymentSucceeded } from "@/lib/payment-lifecycle";

type SimulateBody = { paymentId?: string };

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Test payments are disabled in production." }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let body: SimulateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid test payment request." }, { status: 400 });
  }

  if (!body.paymentId) {
    return NextResponse.json({ error: "Payment is required." }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { id: body.paymentId },
    select: { id: true, order: { select: { customerId: true } } },
  });

  const isAdminTest = session.user.role === "ADMIN" && process.env.VERCEL_ENV !== "production";
  if (!payment || (payment.order.customerId !== session.user.id && !isAdminTest)) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  try {
    const completed = await markPaymentSucceeded(payment.id, "btech_test_" + payment.id);
    return NextResponse.json({ paymentId: completed.id, status: completed.status });
  } catch (error) {
    const code = error instanceof Error ? error.message : "TEST_PAYMENT_ERROR";
    if (["ORDER_NOT_PAYABLE", "INVENTORY_NOT_RESERVED", "RESERVATION_EXPIRED", "PAYMENT_AMOUNT_MISMATCH"].includes(code)) {
      return NextResponse.json({ error: "This order can no longer be paid." }, { status: 409 });
    }
    console.error("Test payment failed", error);
    return NextResponse.json({ error: "Test payment could not be completed." }, { status: 500 });
  }
}
