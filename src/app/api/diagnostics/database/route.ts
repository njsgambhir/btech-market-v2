import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStoreResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function tokenMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const providedToken = Buffer.from(provided);
  const expectedToken = Buffer.from(expected);
  if (providedToken.length !== expectedToken.length) return false;
  return timingSafeEqual(providedToken, expectedToken);
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") {
    return noStoreResponse({ ok: false, error: "NOT_FOUND" }, 404);
  }

  if (!tokenMatches(bearerToken(request), process.env.DATABASE_DIAGNOSTIC_TOKEN)) {
    return noStoreResponse({ ok: false, error: "NOT_FOUND" }, 404);
  }

  try {
    await db.$queryRaw`SELECT 1`;
    return noStoreResponse({ ok: true, check: "SELECT_1" }, 200);
  } catch {
    return noStoreResponse({ ok: false, error: "DATABASE_CONNECTIVITY_CHECK_FAILED" }, 503);
  }
}
