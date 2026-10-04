import { getOffers } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Shop({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams;
  const visible = await getOffers(params.category);

  return (
    <main className="section">
      <p className="eyebrow">MARKETPLACE</p>
      <h1 className="pageTitle">{params.category ?? "Shop devices"}</h1>
      <div className="shopLayout">
        <aside className="filters">
          <strong>Filters</strong>
          <label>Brand<select><option>All brands</option><option>Apple</option><option>Samsung</option></select></label>
          <label>Condition<select><option>All grades</option><option>Refurbished</option><option>Grade A</option><option>Grade B</option></select></label>
          <label>Network<select><option>Any network</option><option>Unlocked</option></select></label>
          <p>Live marketplace inventory is now loaded from the development database. Interactive filters come next.</p>
        </aside>
        <section>
          <div className="resultsBar"><strong>{visible.length} offers</strong><span>Verified marketplace inventory</span></div>
          <div className="productGrid">
            {visible.map((offer) => (
              <a className="productCard" href={"/product/" + offer.id} key={offer.id}>
                <div className="productVisual"><span>{offer.brand}</span></div>
                <div className="productInfo">
                  <span className="productMeta">{offer.grade} · {offer.storage}</span>
                  <h2>{offer.model}</h2>
                  <span>{offer.color} · {offer.carrier}</span>
                  <strong className="price">US${offer.price.toLocaleString()}</strong>
                  <span>{offer.warrantyMonths}-month warranty</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
