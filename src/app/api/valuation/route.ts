
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await db.buybackPrice.findMany({
      where: { active: true },
      select: {
        variantId: true,
        condition: true,
        batteryBand: true,
        currency: true,
        maxPurchasePriceCents: true,
      },
      take: 50,
    });

    return NextResponse.json({
      status: "ok",
      demoOnly: true,
      prices,
    });
  } catch (error) {
    console.error("Valuation API error:", error);

    return NextResponse.json(
      { error: "Unable to retrieve valuations" },
      { status: 500 }
    );
  }
}
