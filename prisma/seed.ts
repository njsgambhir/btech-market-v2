import { Grade, InventoryStatus, ListingStatus, PrismaClient, UserRole } from "@prisma/client";

const db = new PrismaClient();

const seedOffers = [
  { model: "iPhone 15 Pro", slug: "iphone-15-pro", brand: "Apple", category: "iPhone", storage: "256 GB", color: "Black Titanium", carrier: "Unlocked", grade: Grade.GRADE_A, warrantyMonths: 12, sellerEmail: "verified@btechmarket.co", seller: "Btech Verified", priceCents: 89900, batteryHealth: 92 },
  { model: "iPhone 14", slug: "iphone-14", brand: "Apple", category: "iPhone", storage: "128 GB", color: "Blue", carrier: "Unlocked", grade: Grade.GRADE_A, warrantyMonths: 12, sellerEmail: "mobile-renew@example.com", seller: "Mobile Renew", priceCents: 57900, batteryHealth: 90 },
  { model: "Galaxy S24", slug: "galaxy-s24", brand: "Samsung", category: "Samsung", storage: "256 GB", color: "Onyx Black", carrier: "Unlocked", grade: Grade.GRADE_A, warrantyMonths: 12, sellerEmail: "verified@btechmarket.co", seller: "Btech Verified", priceCents: 69900, batteryHealth: 94 },
  { model: "iPad Air (5th gen)", slug: "ipad-air-5", brand: "Apple", category: "iPad", storage: "64 GB", color: "Space Gray", carrier: "Wi-Fi", grade: Grade.REFURBISHED, warrantyMonths: 12, sellerEmail: "techcycle@example.com", seller: "TechCycle", priceCents: 49900, batteryHealth: 91 },
];

async function main() {
  for (const item of seedOffers) {
    const user = await db.user.upsert({
      where: { email: item.sellerEmail },
      update: { role: UserRole.SELLER },
      create: { email: item.sellerEmail, role: UserRole.SELLER },
    });

    const seller = await db.seller.upsert({
      where: { userId: user.id },
      update: { displayName: item.seller, verified: item.seller === "Btech Verified" },
      create: { userId: user.id, displayName: item.seller, verified: item.seller === "Btech Verified" },
    });

    const brand = await db.brand.upsert({ where: { name: item.brand }, update: {}, create: { name: item.brand } });
    const category = await db.category.upsert({ where: { name: item.category }, update: {}, create: { name: item.category } });
    const model = await db.catalogModel.upsert({
      where: { slug: item.slug },
      update: { name: item.model, brandId: brand.id, categoryId: category.id },
      create: { name: item.model, slug: item.slug, brandId: brand.id, categoryId: category.id },
    });
    const variant = await db.variant.upsert({
      where: { modelId_storage_color: { modelId: model.id, storage: item.storage, color: item.color } },
      update: {},
      create: { modelId: model.id, storage: item.storage, color: item.color },
    });

    const existing = await db.sellerListing.findFirst({ where: { sellerId: seller.id, variantId: variant.id, carrier: item.carrier, grade: item.grade } });
    const listing = existing
      ? await db.sellerListing.update({ where: { id: existing.id }, data: { status: ListingStatus.ACTIVE, warrantyMonths: item.warrantyMonths, priceCents: item.priceCents } })
      : await db.sellerListing.create({ data: { sellerId: seller.id, variantId: variant.id, carrier: item.carrier, grade: item.grade, warrantyMonths: item.warrantyMonths, priceCents: item.priceCents, status: ListingStatus.ACTIVE } });

    const inventory = await db.inventoryUnit.findFirst({ where: { listingId: listing.id } });
    if (inventory) {
      await db.inventoryUnit.update({ where: { id: inventory.id }, data: { batteryHealth: item.batteryHealth, status: InventoryStatus.AVAILABLE } });
    } else {
      await db.inventoryUnit.create({ data: { listingId: listing.id, batteryHealth: item.batteryHealth, status: InventoryStatus.AVAILABLE } });
    }
  }
}

main().finally(() => db.$disconnect());
