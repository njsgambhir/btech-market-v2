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
  const allowedTestListing =
    (listing.seller.displayName === "Btech Verified" && listing.variant.model.name === "iPhone 15 Pro") ||
    (listing.seller.displayName === "Mobile Renew" && listing.variant.model.name === "iPhone 14");
  if (!allowedTestListing) {
    return NextResponse.json({ error: "This listing is not enabled for Preview test inventory." }, { status: 409 });
  }
  if (listing.seller.status !== "APPROVED") {
    return NextResponse.json({ error: "Seller must be approved before test inventory can be added." }, { status: 409 });
  }

  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const unit = await db.inventoryUnit.create({
    data: {
      listingId: listing.id,
      serialNumber: `${listing.seller.displayName === "Mobile Renew" ? "MOBILE-RENEW" : "BTECH"}-DEV-${suffix}`,
      batteryHealth: 94,
      status: "AVAILABLE",
    },
  });

  return NextResponse.json({ ok: true, inventoryUnitId: unit.id, serialNumber: unit.serialNumber });
}
