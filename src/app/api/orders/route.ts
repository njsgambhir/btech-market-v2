
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const offerToListing: Record<string, string> = {
  "iphone-15-pro-256-black-a": "listing-iphone15pro",
  "iphone-14-128-blue-a": "listing-iphone14",
  "galaxy-s24-256-black-a": "listing-galaxys24",
  "ipad-air-5-64-space-gray-ref": "listing-ipadair5",
};

export async function GET() {
  try {
    const count = await db.order.count();

    return NextResponse.json({
      message: "Orders database query successful",
      database: "connected",
      orderCount: count,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Unable to retrieve orders",
        database: "error",
      },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Please sign in before placing an order." },
        { status: 401 }
      );
    }

    const customer = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!customer || customer.role === "SELLER") {
      return NextResponse.json(
        { error: "An eligible customer account is required." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || !Array.isArray(body.items) ||
        body.items.length === 0 || body.items.length > 20) {
      return NextResponse.json(
        { error: "Invalid shopping cart." },
        { status: 400 }
      );
    }

    const quantities = new Map<string, number>();

    for (const item of body.items) {
      if (
        !item ||
        typeof item.offerId !== "string" ||
        !Object.prototype.hasOwnProperty.call(
          offerToListing,
          item.offerId
        ) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 10
      ) {
        return NextResponse.json(
          { error: "Invalid product or quantity." },
          { status: 400 }
        );
      }

      const listingId = offerToListing[item.offerId];
      const quantity =
        (quantities.get(listingId) ?? 0) + item.quantity;

      if (quantity > 10) {
        return NextResponse.json(
          { error: "Quantity exceeds the allowed limit." },
          { status: 400 }
        );
      }

      quantities.set(listingId, quantity);
    }

    const listingIds = [...quantities.keys()];

    const listings = await db.sellerListing.findMany({
      where: {
        id: { in: listingIds },
        status: "ACTIVE",
      },
      select: {
        id: true,
        priceCents: true,
      },
    });

    if (listings.length !== listingIds.length) {
      return NextResponse.json(
        { error: "One or more products are unavailable." },
        { status: 409 }
      );
    }

    const availableUnits = await db.inventoryUnit.groupBy({
      by: ["listingId"],
      where: {
        listingId: { in: listingIds },
        status: "AVAILABLE",
      },
      _count: { _all: true },
    });

    for (const [listingId, quantity] of quantities) {
      const available =
        availableUnits.find(
          (row) => row.listingId === listingId
        )?._count._all ?? 0;

      if (quantity > available) {
        return NextResponse.json(
          { error: "Insufficient available inventory." },
          { status: 409 }
        );
      }
    }

    const lines = listings.map((listing) => ({
      listingId: listing.id,
      quantity: quantities.get(listing.id)!,
      unitPriceCents: listing.priceCents,
    }));

    const totalCents = lines.reduce(
      (sum, line) =>
        sum + line.quantity * line.unitPriceCents,
      0
    );

    const order = await db.order.create({
      data: {
        customerId: customer.id,
        status: "PENDING_PAYMENT",
        totalCents,
        lines: { create: lines },
      },
      select: {
        id: true,
        status: true,
        totalCents: true,
      },
    });

    return NextResponse.json(
      { message: "Pending order created", order },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order creation failed:", error);

    return NextResponse.json(
      { error: "Unable to create order." },
      { status: 500 }
    );
  }
}
