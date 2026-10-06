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
      where: {
        sellerId,
        type: "SALE_CREDIT",
        status: "PENDING",
      },
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
      where: {
        sellerId,
        status: "PAID",
      },
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

export async function simulateSellerPayout(sellerId: string) {
  return db.$transaction(async (tx) => {
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

    const payout = await tx.sellerPayout.create({
      data: {
        sellerId,
        status: "PAID",
        amountCents,
        currency,
        provider: "development",
        providerRef: `btech_dev_payout_${crypto.randomUUID()}`,
        paidAt: now,
        note: "Development payout simulation.",
      },
    });

    await tx.sellerLedgerEntry.updateMany({
      where: { id: { in: availableEntries.map((entry) => entry.id) }, status: "POSTED" },
      data: { status: "SETTLED" },
    });

    await tx.sellerLedgerEntry.create({
      data: {
        sellerId,
        type: "PAYOUT",
        status: "SETTLED",
        amountCents: -amountCents,
        currency,
        note: `Seller payout ${payout.id} completed.`,
      },
    });

    return payout;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
