import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: { listingId?: string; status?: "ACTIVE" | "PAUSED" };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.listingId || !body.status || !["ACTIVE", "PAUSED"].includes(body.status)) {
    return NextResponse.json({ error: "Listing and valid status are required." }, { status: 400 });
  }

  const listing = await db.sellerListing.update({
    where: { id: body.listingId },
    data: { status: body.status },
    select: { id: true, status: true },
  });
  return NextResponse.json({ listing });
}
