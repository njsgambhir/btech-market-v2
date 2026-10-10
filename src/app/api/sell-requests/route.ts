
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";



export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      phoneModel,
      storage,
      condition,
      batteryBand,
      estimatedOfferCents,
    } = body;

    if (
      typeof phoneModel !== "string" ||
      typeof storage !== "string" ||
      typeof condition !== "string" ||
      typeof batteryBand !== "string" ||
      !Number.isSafeInteger(estimatedOfferCents) ||
      estimatedOfferCents <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid sell request." },
        { status: 400 }
      );
    }

    const sellRequest = await db.sellRequest.create({
      data: {
        customerId: session.user.id,
        phoneModel,
        storage,
        condition,
        batteryBand,
        estimatedOfferCents,
        currency: "CAD",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      status: "ok",
      requestId: sellRequest.id,
    });
  } catch (error) {
    console.error("Sell request error:", error);

    return NextResponse.json(
      { error: "Unable to submit sell request." },
      { status: 500 }
    );
  }
}
