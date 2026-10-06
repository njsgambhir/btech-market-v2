import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartLink } from "@/components/cart/cart-link";

export const metadata: Metadata = {
  title: "Btech Market",
  description: "Buy, sell and trade quality mobile devices with confidence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en"><body><CartProvider>
      {process.env.VERCEL_ENV !== "production" ? (
        <div style={{ background: "#111", color: "#fff", padding: "8px 16px", textAlign: "center", fontSize: 13, fontWeight: 700, letterSpacing: ".04em" }}>
          PREVIEW BUILD · {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}
        </div>
      ) : null}
      <header className="siteHeader">
        <a className="brand" href="/">BTECH MARKET</a>
        <nav aria-label="Main navigation">
          <a href="/shop">Shop</a><a href="/sell">Sell</a><a href="/trade-in">Trade In</a>
          <a href="/account">Account</a><CartLink />
        </nav>
      </header>
      {children}
      <footer className="siteFooter"><strong>Btech Market</strong><span>Marketplace for quality mobile technology.</span></footer>
    </CartProvider></body></html>
  );
}