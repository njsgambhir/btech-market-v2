import { Grade } from "@prisma/client";
import { db } from "@/lib/db";

export type MarketplaceOffer = {
  id: string;
  model: string;
  brand: string;
  category: string;
  storage: string;
  color: string;
  carrier: string;
  grade: "Refurbished" | "Grade A" | "Grade B";
  warrantyMonths: number;
  seller: string;
  price: number;
  batteryHealth: number;
};

function displayGrade(grade: Grade): MarketplaceOffer["grade"] {
  if (grade === Grade.GRADE_A) return "Grade A";
  if (grade === Grade.GRADE_B) return "Grade B";
  return "Refurbished";
}

const include = {
  seller: true,
  variant: { include: { model: { include: { brand: true, category: true } } } },
  inventory: { where: { status: "AVAILABLE" as const }, orderBy: { createdAt: "asc" as const } },
};

function toOffer(listing: any): MarketplaceOffer {
  const unit = listing.inventory[0];
  return {
    id: listing.id,
    model: listing.variant.model.name,
    brand: listing.variant.model.brand.name,
    category: listing.variant.model.category.name,
    storage: listing.variant.storage,
    color: listing.variant.color,
    carrier: listing.carrier,
    grade: displayGrade(listing.grade),
    warrantyMonths: listing.warrantyMonths,
    seller: listing.seller.displayName,
    price: listing.priceCents / 100,
    batteryHealth: unit?.batteryHealth ?? 0,
  };
}

export async function getOffers(category?: string) {
  const listings = await db.sellerListing.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { variant: { model: { category: { name: category } } } } : {}),
      inventory: { some: { status: "AVAILABLE" } },
    },
    include,
    orderBy: { createdAt: "asc" },
  });
  return listings.map(toOffer);
}

export async function getOffer(id: string) {
  const listing = await db.sellerListing.findFirst({
    where: { id, status: "ACTIVE", inventory: { some: { status: "AVAILABLE" } } },
    include,
  });
  return listing ? toOffer(listing) : undefined;
}
