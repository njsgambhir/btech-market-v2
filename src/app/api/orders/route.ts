
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
