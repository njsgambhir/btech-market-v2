export type Grade = "Refurbished" | "Grade A" | "Grade B";

export type MarketplaceOffer = {
  id: string;
  model: string;
  brand: string;
  category: string;
  storage: string;
  color: string;
  carrier: string;
  grade: Grade;
  warrantyMonths: number;
  seller: string;
  price: number;
  batteryHealth: number;
};

export const offers: MarketplaceOffer[] = [
  { id:"iphone-15-pro-256-black-a", model:"iPhone 15 Pro", brand:"Apple", category:"iPhone", storage:"256 GB", color:"Black Titanium", carrier:"Unlocked", grade:"Grade A", warrantyMonths:12, seller:"Btech Verified", price:899, batteryHealth:92 },
  { id:"iphone-14-128-blue-a", model:"iPhone 14", brand:"Apple", category:"iPhone", storage:"128 GB", color:"Blue", carrier:"Unlocked", grade:"Grade A", warrantyMonths:12, seller:"Mobile Renew", price:579, batteryHealth:90 },
  { id:"galaxy-s24-256-black-a", model:"Galaxy S24", brand:"Samsung", category:"Samsung", storage:"256 GB", color:"Onyx Black", carrier:"Unlocked", grade:"Grade A", warrantyMonths:12, seller:"Btech Verified", price:699, batteryHealth:94 },
  { id:"ipad-air-5-64-space-gray-ref", model:"iPad Air (5th gen)", brand:"Apple", category:"iPad", storage:"64 GB", color:"Space Gray", carrier:"Wi-Fi", grade:"Refurbished", warrantyMonths:12, seller:"TechCycle", price:499, batteryHealth:91 }
];

export function getOffer(id: string) {
  return offers.find((offer) => offer.id === id);
}
