import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Btech Market",
  description: "Buy, sell and trade quality mobile devices with confidence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <a className="brand" href="/">BTECH MARKET</a>
          <nav aria-label="Main navigation">
            <a href="/shop">Shop</a>
            <a href="/sell">Sell</a>
            <a href="/trade-in">Trade In</a>
            <a href="/account">Account</a>
          </nav>
        </header>
        {children}
        <footer className="siteFooter">
          <strong>Btech Market</strong>
          <span>Marketplace for quality mobile technology.</span>
        </footer>
      </body>
    </html>
  );
}
