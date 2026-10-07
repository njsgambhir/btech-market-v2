import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { simulateSellerPayout } from "@/lib/seller-payout-lifecycle";

type Body = { sellerId?: string; requestId?: string };

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Test payouts are disabled in production." }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.sellerId) return NextResponse.json({ error: "Seller is required." }, { status: 400 });
  if (!body.requestId || !/^[A-Za-z0-9_-]{8,100}$/.test(body.requestId)) {
    return NextResponse.json({ error: "A valid payout request ID is required." }, { status: 400 });
  }

  const seller = await db.seller.findUnique({ where: { id: body.sellerId }, select: { id: true, status: true } });
  if (!seller) return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  if (seller.status !== "APPROVED") return NextResponse.json({ error: "Only approved sellers can receive payouts." }, { status: 409 });

  try {
    const result = await simulateSellerPayout(seller.id, body.requestId);
    return NextResponse.json({
      ok: true,
      payoutId: result.payout.id,
      amountCents: result.payout.amountCents,
      status: result.payout.status,
      duplicate: result.duplicate,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYOUT_ERROR";
    if (code === "NO_POSITIVE_PAYOUT_BALANCE") {
      return NextResponse.json({ error: "Seller has no positive payout balance available." }, { status: 409 });
    }
    if (code === "MIXED_PAYOUT_CURRENCY") {
      return NextResponse.json({ error: "Seller payout contains mixed currencies." }, { status: 409 });
    }
    if (code === "PAYOUT_BALANCE_CHANGED" || code === "PAYOUT_REQUEST_CONFLICT") {
      return NextResponse.json({ error: "Payout state changed. Refresh the page before trying again." }, { status: 409 });
    }
    console.error("Test payout failed", error);
    return NextResponse.json({ error: "Test payout could not be completed." }, { status: 500 });
  }
}
