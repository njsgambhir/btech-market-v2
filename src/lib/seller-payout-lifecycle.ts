import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function refreshEligibleSellerCredits(now = new Date()) {
  return db.sellerLedgerEntry.updateMany({
    where: {
      type: "SALE_CREDIT",
      status: "PENDING",
      eligibleAt: { lte: now },
    },
    data: { status: "POSTED" },
  });
}

export async function getSellerSettlementSummary(sellerId: string, now = new Date()) {
  await refreshEligibleSellerCredits(now);

  const [pendingReserve, available, paid] = await Promise.all([
    db.sellerLedgerEntry.aggregate({
      where: { sellerId, type: "SALE_CREDIT", status: "PENDING" },
      _sum: { amountCents: true },
    }),
    db.sellerLedgerEntry.aggregate({
      where: {
        sellerId,
        status: "POSTED",
        type: { in: ["SALE_CREDIT", "RETURN_DEBIT", "SHIPPING_DEBIT", "ADJUSTMENT"] },
      },
      _sum: { amountCents: true },
    }),
    db.sellerPayout.aggregate({
      where: { sellerId, status: "PAID" },
      _sum: { amountCents: true },
    }),
  ]);

  return {
    pendingCents: pendingReserve._sum.amountCents ?? 0,
    availableCents: available._sum.amountCents ?? 0,
    paidCents: paid._sum.amountCents ?? 0,
  };
}

export async function getSellerPayoutBalance(sellerId: string, now = new Date()) {
  const { availableCents, paidCents } = await getSellerSettlementSummary(sellerId, now);
  return { availableCents, paidCents };
}

export async function simulateSellerPayout(sellerId: string, requestId: string) {
  const providerRef = `btech_dev_payout_${requestId}`;

  const existing = await db.sellerPayout.findUnique({ where: { providerRef } });
  if (existing) {
    if (existing.sellerId !== sellerId) throw new Error("PAYOUT_REQUEST_CONFLICT");
    return { payout: existing, duplicate: true };
  }

  try {
    const payout = await db.$transaction(async (tx) => {
      const now = new Date();

      await tx.sellerLedgerEntry.updateMany({
        where: {
          sellerId,
          type: "SALE_CREDIT",
          status: "PENDING",
          eligibleAt: { lte: now },
        },
        data: { status: "POSTED" },
      });

      const availableEntries = await tx.sellerLedgerEntry.findMany({
        where: {
          sellerId,
          status: "POSTED",
          type: { in: ["SALE_CREDIT", "RETURN_DEBIT", "SHIPPING_DEBIT", "ADJUSTMENT"] },
        },
        select: { id: true, amountCents: true, currency: true },
      });

      const currency = availableEntries[0]?.currency ?? "USD";
      if (availableEntries.some((entry) => entry.currency !== currency)) {
        throw new Error("MIXED_PAYOUT_CURRENCY");
      }

      const amountCents = availableEntries.reduce((sum, entry) => sum + entry.amountCents, 0);
      if (amountCents <= 0) throw new Error("NO_POSITIVE_PAYOUT_BALANCE");

      const created = await tx.sellerPayout.create({
        data: {
          sellerId,
          status: "PAID",
          amountCents,
          currency,
          provider: "development",
          providerRef,
          paidAt: now,
          note: "Development payout simulation.",
        },
      });

      await tx.sellerPayoutItem.createMany({
        data: availableEntries.map((entry) => ({
          payoutId: created.id,
          sellerId,
          ledgerEntryId: entry.id,
          amountCents: entry.amountCents,
          currency: entry.currency,
        })),
      });

      const settled = await tx.sellerLedgerEntry.updateMany({
        where: {
          id: { in: availableEntries.map((entry) => entry.id) },
          status: "POSTED",
        },
        data: { status: "SETTLED" },
      });
      if (settled.count !== availableEntries.length) throw new Error("PAYOUT_BALANCE_CHANGED");

      await tx.sellerLedgerEntry.create({
        data: {
          sellerId,
          type: "PAYOUT",
          status: "SETTLED",
          amountCents: -amountCents,
          currency,
          note: `Seller payout ${created.id} completed.`,
        },
      });

      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return { payout, duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await db.sellerPayout.findUnique({ where: { providerRef } });
      if (duplicate?.sellerId === sellerId) return { payout: duplicate, duplicate: true };
    }
    throw error;
  }
}
