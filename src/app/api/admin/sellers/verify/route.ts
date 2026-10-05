import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: { sellerId?: string; verified?: boolean };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.sellerId || typeof body.verified !== "boolean") {
    return NextResponse.json({ error: "Seller and verification status are required." }, { status: 400 });
  }

  const seller = await db.seller.update({
    where: { id: body.sellerId },
    data: { verified: body.verified },
    select: { id: true, displayName: true, verified: true },
  });
  return NextResponse.json({ seller });
}
