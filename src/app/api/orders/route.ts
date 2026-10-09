import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      message: "Btech Market Orders API is connected to Neon",
      database: "connected",
    });
  } catch {
    return NextResponse.json(
      {
        message: "Database connection failed",
        database: "disconnected",
      },
      { status: 503 }
    );
  }
}
