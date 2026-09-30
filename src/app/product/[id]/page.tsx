import { getOffer } from "@/lib/catalog";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

export default async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = getOffer(id);
  if (!offer) notFound();
  return (
    <main className="section productPage">
      <div className="productHeroVisual"><span>{offer.brand}</span><strong>{offer.model}</strong></div>
      <section className="productDetails">
        <p className="eyebrow">{offer.grade} · VERIFIED OFFER</p>
        <h1 className="productTitle">{offer.model}</h1><p className="productPrice">${offer.price.toLocaleString()}</p>
        <div className="specGrid">
          <div><span>Storage</span><strong>{offer.storage}</strong></div><div><span>Colour</span><strong>{offer.color}</strong></div>
          <div><span>Network</span><strong>{offer.carrier}</strong></div><div><span>Battery health</span><strong>{offer.batteryHealth}%</strong></div>
          <div><span>Warranty</span><strong>{offer.warrantyMonths} months</strong></div><div><span>Seller</span><strong>{offer.seller}</strong></div>
        </div>
        <AddToCartButton offerId={offer.id} />
        <p className="finePrint">Cart contents are now retained in this browser. Server-side inventory reservation will be added with checkout.</p>
      </section>
    </main>
  );
}