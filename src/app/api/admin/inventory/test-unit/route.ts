import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

type Body = { listingId?: string };

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Test inventory is disabled in production." }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.listingId) return NextResponse.json({ error: "Listing is required." }, { status: 400 });

  const listing = await db.sellerListing.findUnique({
    where: { id: body.listingId },
    include: { seller: true, variant: { include: { model: true } } },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (listing.seller.displayName !== "Btech Verified" || listing.variant.model.name !== "iPhone 15 Pro") {
    return NextResponse.json({ error: "This test action is limited to the Btech Verified iPhone 15 Pro listing." }, { status: 409 });
  }

  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const unit = await db.inventoryUnit.create({
    data: {
      listingId: listing.id,
      serialNumber: `BTECH-DEV-${suffix}`,
      batteryHealth: 94,
      status: "AVAILABLE",
    },
  });

  return NextResponse.json({ ok: true, inventoryUnitId: unit.id, serialNumber: unit.serialNumber });
}
