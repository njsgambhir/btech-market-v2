import { offers } from "@/lib/catalog";

export type CartLine = {
  offerId: string;
  quantity: number;
};

export const demoCart: CartLine[] = [
  { offerId: "iphone-15-pro-256-black-a", quantity: 1 },
];

export function cartDetails(lines: CartLine[]) {
  return lines.flatMap((line) => {
    const offer = offers.find((item) => item.id === line.offerId);
    return offer ? [{ ...line, offer }] : [];
  });
}

export function cartTotal(lines: CartLine[]) {
  return cartDetails(lines).reduce((sum, line) => sum + line.offer.price * line.quantity, 0);
}
