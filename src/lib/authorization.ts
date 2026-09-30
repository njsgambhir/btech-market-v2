import { auth } from "@/auth";
import { redirect } from "next/navigation";
export type AppRole = "CUSTOMER" | "SELLER" | "ADMIN";
export async function requireRole(allowed: AppRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/account");
  const role = (session.user.role ?? "CUSTOMER") as AppRole;
  if (!allowed.includes(role)) redirect("/account?error=forbidden");
  return session;
}
