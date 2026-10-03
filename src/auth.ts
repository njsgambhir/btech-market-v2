import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Use the stable production auth endpoint as the OAuth callback proxy so
  // Vercel preview deployment hostnames can change without breaking GitHub OAuth.
  redirectProxyUrl: process.env.AUTH_REDIRECT_PROXY_URL,
  providers: [
    GitHub({
      // The redirect proxy carries the original preview origin in OAuth state.
      // Using state avoids a PKCE verifier cookie that would otherwise be scoped
      // to the preview hostname and unavailable on the stable callback hostname.
      checks: ["state"],
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      if (token.email) {
        const email = token.email.toLowerCase();
        const user = await db.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            firstName: typeof token.name === "string" ? token.name : undefined,
          },
          select: { id: true, role: true },
        });

        // Orders created by guest checkout already point at the User row that
        // checkout upserts by email. Keep this repair step for older dev data.
        await db.order.updateMany({
          where: { email, customerId: { not: user.id } },
          data: { customerId: user.id },
        });

        token.userId = user.id;
        token.role = user.role;
      } else if (!token.role) {
        token.role = "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? token.sub ?? "");
        session.user.role = String(token.role ?? "CUSTOMER");
      }
      return session;
    },
  },
});
