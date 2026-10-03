import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ authenticated: false });
  }

  const email = session.user.email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: { firstName: true, lastName: true },
  });

  return NextResponse.json({
    authenticated: true,
    email,
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
  });
}
