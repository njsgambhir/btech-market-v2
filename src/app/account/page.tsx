import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { expirePendingReservations } from "@/lib/order-lifecycle";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.email) {
    return (
      <main className="section narrowPage">
        <p className="eyebrow">BTECH ACCOUNT</p>
        <h1 className="pageTitle">Your marketplace account.</h1>
        <div className="accountGrid">
          <section className="panel">
            <h2>Sign in securely</h2>
            <p>Sign in to see orders linked to your account and manage your marketplace activity.</p>
            <form action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/account" });
            }}>
              <button className="buyButton" type="submit">Continue with GitHub — Development</button>
            </form>
          </section>
          <section className="panel accountIntro">
            <h2>Customer accounts</h2>
            <p>Your checkout email is used to connect existing orders after you sign in with the same email address.</p>
            <p>Additional customer sign-in methods will be added before launch.</p>
          </section>
        </div>
      </main>
    );
  }

  const email = session.user.email.toLowerCase();
  const customer = await db.user.findUnique({ where: { email }, select: { id: true, firstName: true } });
  await expirePendingReservations();

  const orders = await db.order.findMany({
    where: customer?.id ? { customerId: customer.id } : { email },
    orderBy: { createdAt: "desc" },
    include: {
      lines: {
        include: { listing: { include: { variant: { include: { model: true } } } } },
      },
    },
  });

  return (
    <main className="section narrowPage">
      <p className="eyebrow">BTECH ACCOUNT</p>
      <h1 className="pageTitle">Welcome back{customer?.firstName ? ", " + customer.firstName : ""}.</h1>
      <section className="panel">
        <p><strong>{session.user.email}</strong></p>
        <p>Account role: {session.user.role}</p>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}>
          <button className="button secondary" type="submit">Sign out</button>
        </form>
      </section>

      <section style={{ marginTop: "32px" }}>
        <p className="eyebrow">ORDER HISTORY</p>
        <h2>Your orders</h2>
        {!orders.length ? (
          <div className="panel">
            <p>No orders are linked to this email yet.</p>
            <a className="button primary" href="/shop">Shop devices</a>
          </div>
        ) : orders.map((order) => (
          <article className="panel" style={{ marginTop: "16px" }} key={order.id}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "48px", flexWrap: "wrap" }}>
              <span>Order # {order.id.slice(-8).toUpperCase()}</span>
              <span>Amount <strong>{ "US$" + (order.totalCents / 100).toLocaleString() }</strong></span>
            </div>
            <p>{order.status.replaceAll("_", " ")} · {order.createdAt.toLocaleDateString()}</p>
            {order.lines.map((line) => (
              <p key={line.id}>
                <strong>{line.listing.variant.model.name}</strong> · {line.listing.variant.storage} · {line.listing.variant.color} × {line.quantity}
              </p>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}
