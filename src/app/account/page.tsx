
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
export default async function AccountPage() {
  const session = await auth();
const orders = session?.user?.email
  ? await db.order.findMany({
      where: {
        customer: {
          email: session.user.email,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    })
  : [];
  return (
    <main className="section narrowPage">
      <p className="eyebrow">BTECH ACCOUNT</p>
      <h1 className="pageTitle">
        {session?.user ? "My account" : "Welcome back."}
      </h1>

      <div className="accountGrid">
        <section className="panel">
          {session?.user ? (
            <>
              <h2>Signed in</h2>
              <p>
                Welcome, {session.user.name ?? session.user.email}
              </p>
              <p>Role: {session.user.role ?? "CUSTOMER"}</p>

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/account" });
                }}
              >
                <button className="buyButton" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Sign in</h2>
              <p>Sign in securely using your GitHub account.</p>

              <form
                action={async () => {
                  "use server";
                  await signIn("github", {
                    redirectTo: "/account",
                  });
                }}
              >
                <button className="buyButton" type="submit">
                  Continue with GitHub
                </button>
              </form>
            </>
          )}
        </section>

        <section className="panel accountIntro">
          <h2>Welcome to Btech Market</h2>
          <p>
            Manage your account, track orders, review purchases
            and manage trade-ins.
          </p>
        </section>
      </div>
      {session?.user && (
  <section className="panel">
    <h2>My Orders</h2>
    {orders.length === 0 ? (
      <p>You have no orders yet.</p>
    ) : (
      <div>
        {orders.map((order) => (
        <div
  key={order.id}
  className="orderDetails"
  style={{
    padding: "12px 0",
    borderBottom: "1px solid #e5e7eb",
  }}
>
<style>{`
  .orderDetails p {
    margin: 4px 0;
  }
`}</style>
            <p><strong>Order:</strong> {order.id}</p>
            <p><strong>Date:</strong> {order.createdAt.toLocaleDateString("en-CA", {
  year: "numeric",
  month: "long",
  day: "numeric",
})}</p>
            <p><strong>Status:</strong> {order.status
  .toLowerCase()
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase())}</p>
            <p><strong>Total:</strong> ${(order.totalCents / 100).toFixed(2)}</p>
            <hr />
          </div>
        ))}
      </div>
    )}
  </section>
)}
    </main>
  );
}
