import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

type Body = { ledgerEntryId?: string };

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Reserve testing is disabled in production." }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.ledgerEntryId) return NextResponse.json({ error: "Seller credit is required." }, { status: 400 });

  const credit = await db.sellerLedgerEntry.findUnique({
    where: { id: body.ledgerEntryId },
    include: { orderLine: { include: { order: true } } },
  });

  if (!credit || credit.type !== "SALE_CREDIT") {
    return NextResponse.json({ error: "Seller credit not found." }, { status: 404 });
  }
  if (credit.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending seller credits can be advanced." }, { status: 409 });
  }
  if (!credit.orderLine?.order.deliveredAt || credit.orderLine.order.status !== "DELIVERED") {
    return NextResponse.json({ error: "Order must be delivered before the reserve can be completed." }, { status: 409 });
  }
  if (credit.commissionBps == null || credit.commissionAmountCents == null || credit.grossAmountCents == null) {
    return NextResponse.json({ error: "Legacy seller credits cannot use the reserve test action." }, { status: 409 });
  }

  const eligibleAt = new Date(Date.now() - 1000);
  await db.sellerLedgerEntry.update({
    where: { id: credit.id },
    data: { eligibleAt },
  });

  return NextResponse.json({ ok: true, eligibleAt });
}
