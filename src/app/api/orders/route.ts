import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Btech Market Orders API is working",
  });
}
