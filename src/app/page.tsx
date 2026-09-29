const categories = ["iPhone", "Samsung", "iPad", "MacBook"];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">SMARTER DEVICE MARKETPLACE</p>
          <h1>Premium tech. Better value. Built on trust.</h1>
          <p className="lede">
            Shop quality-graded devices from verified sellers, or give your current device a second life.
          </p>
          <div className="actions">
            <a className="button primary" href="/shop">Shop devices</a>
            <a className="button secondary" href="/trade-in">Trade in your device</a>
          </div>
        </div>
        <div className="heroCard" aria-label="Marketplace promise">
          <span>QUALITY STANDARD</span>
          <strong>Verified devices</strong>
          <p>Clear grading, device details, warranty information and seller accountability.</p>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeading">
          <p className="eyebrow">EXPLORE</p>
          <h2>Shop by category</h2>
        </div>
        <div className="categoryGrid">
          {categories.map((category) => (
            <a className="categoryCard" href={"/shop?category=" + encodeURIComponent(category)} key={category}>
              <span>Explore</span><strong>{category}</strong><span>View devices →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="trustBand">
        <div><strong>Transparent grading</strong><span>Know the condition before you buy.</span></div>
        <div><strong>Verified marketplace</strong><span>Seller standards and device checks.</span></div>
        <div><strong>Trade-in ready</strong><span>A simpler path to your next device.</span></div>
      </section>
    </main>
  );
}
