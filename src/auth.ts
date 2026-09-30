import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      if (!token.role) token.role = "CUSTOMER";
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = String(token.role ?? "CUSTOMER");
      return session;
    },
  },
});
