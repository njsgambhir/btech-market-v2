import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const statuses = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"] as const;
type SellerStatus = (typeof statuses)[number];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: { sellerId?: string; status?: SellerStatus };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.sellerId || !body.status || !statuses.includes(body.status)) {
    return NextResponse.json({ error: "Seller and valid approval status are required." }, { status: 400 });
  }

  const approved = body.status === "APPROVED";
  const seller = await db.seller.update({
    where: { id: body.sellerId },
    data: { status: body.status, verified: approved },
    select: { id: true, displayName: true, status: true, verified: true },
  });
  return NextResponse.json({ seller });
}
