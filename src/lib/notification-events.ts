export type BuyerNotificationEvent =
  | "ORDER_CREATED"
  | "PAYMENT_RECEIVED"
  | "ORDER_PROCESSING"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "ORDER_REFUNDED";

export type BuyerNotification = {
  event: BuyerNotificationEvent;
  orderId: string;
  email: string;
  phone?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
};

// Development boundary for buyer communications.
// A real email/SMS provider can replace this implementation without changing
// the order and fulfillment lifecycle that emits these events.
export async function notifyBuyer(notification: BuyerNotification) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[buyer-notification]", notification);
  }
}
