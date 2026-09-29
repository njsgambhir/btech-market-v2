export default function AccountPage() {
  return (
    <main className="section narrowPage">
      <p className="eyebrow">BTECH ACCOUNT</p>
      <h1 className="pageTitle">Welcome back.</h1>
      <div className="accountGrid">
        <section className="panel">
          <h2>Sign in</h2>
          <form className="checkoutForm">
            <label>Email<input type="email" /></label>
            <label>Password<input type="password" /></label>
            <button className="buyButton" type="button">Sign in</button>
          </form>
        </section>
        <section className="panel accountIntro">
          <h2>New to Btech Market?</h2>
          <p>Create an account to track orders, save delivery details, review purchases and manage trade-ins.</p>
          <button className="button secondary" type="button">Create account</button>
        </section>
      </div>
    </main>
  );
}
