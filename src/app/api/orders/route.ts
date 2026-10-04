import { InventoryStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { expirePendingReservationsInTransaction } from "@/lib/order-lifecycle";
import { notifyBuyer } from "@/lib/notification-events";

type CheckoutBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  items?: Array<{ offerId?: string; quantity?: number }>;
};

export async function POST(request: NextRequest) {
  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const session = await auth();
  // A signed-in customer must always check out with the authenticated email.
  // The browser field is read-only for convenience, but authorization is enforced here.
  const email = session?.user?.email?.toLowerCase() ?? body.email?.trim().toLowerCase();
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const address = body.address?.trim();
  const city = body.city?.trim();
  const postalCode = body.postalCode?.trim();
  const country = body.country?.trim();
  const items = (body.items ?? []).filter((item) => item.offerId && Number.isInteger(item.quantity) && (item.quantity ?? 0) > 0);

  if (!email || !firstName || !lastName || !address || !city || !postalCode || !country || !items.length) {
    return NextResponse.json({ error: "Please complete all checkout fields." }, { status: 400 });
  }

  try {
    const order = await db.$transaction(async (tx) => {
      const customer = await tx.user.upsert({
        where: { email },
        update: { firstName, lastName },
        create: { email, firstName, lastName },
      });

      const requestedIds = items.map((item) => item.offerId as string);
      // Clean up abandoned unpaid reservations before checking stock.
      await expirePendingReservationsInTransaction(tx);

      const listings = await tx.sellerListing.findMany({
        where: { id: { in: requestedIds }, status: "ACTIVE" },
        include: { inventory: { where: { status: InventoryStatus.AVAILABLE }, orderBy: { createdAt: "asc" } } },
      });

      let totalCents = 0;
      for (const item of items) {
        const listing = listings.find((candidate) => candidate.id === item.offerId);
        const quantity = item.quantity as number;
        if (!listing || listing.inventory.length < quantity) throw new Error("INVENTORY");
        totalCents += listing.priceCents * quantity;
      }

      const created = await tx.order.create({
        data: { customerId: customer.id, totalCents, email, firstName, lastName, address, city, postalCode, country },
      });

      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000);
      for (const item of items) {
        const listing = listings.find((candidate) => candidate.id === item.offerId)!;
        const quantity = item.quantity as number;
        const line = await tx.orderLine.create({
          data: { orderId: created.id, listingId: listing.id, quantity, unitPriceCents: listing.priceCents },
        });

        for (const unit of listing.inventory.slice(0, quantity)) {
          const reserved = await tx.inventoryUnit.updateMany({
            where: { id: unit.id, status: InventoryStatus.AVAILABLE },
            data: { status: InventoryStatus.RESERVED, orderLineId: line.id, reservedUntil },
          });
          if (reserved.count !== 1) throw new Error("INVENTORY");
        }
      }

      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await notifyBuyer({ event: "ORDER_CREATED", orderId: order.id, email: order.email });
    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVENTORY") {
      return NextResponse.json({ error: "One or more devices are no longer available. Please review your cart." }, { status: 409 });
    }
    console.error("Checkout failed", error);
    return NextResponse.json({ error: "Checkout could not be created. Please try again." }, { status: 500 });
  }
}
