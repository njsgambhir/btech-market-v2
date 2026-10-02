import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      if (token.email) {
        const user = await db.user.findUnique({
          where: { email: token.email.toLowerCase() },
          select: { role: true },
        });
        token.role = user?.role ?? "CUSTOMER";
      } else if (!token.role) {
        token.role = "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = String(token.role ?? "CUSTOMER");
      return session;
    },
  },
});
