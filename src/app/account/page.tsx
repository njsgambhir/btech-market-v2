
import { auth, signIn, signOut } from "@/auth";

export default async function AccountPage() {
  const session = await auth();

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
    </main>
  );
}
