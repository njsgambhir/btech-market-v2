import { NextRequest, NextResponse } from "next/server";
import { getOffers } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (!ids.length) return NextResponse.json([]);
  const offers = await getOffers();
  return NextResponse.json(
    offers.filter((offer) => ids.includes(offer.id)).map(({ id, model, price }) => ({ id, model, price }))
  );
}
