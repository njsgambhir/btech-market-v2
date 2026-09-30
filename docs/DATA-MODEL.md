# Btech Market V2 Data Model — Draft

This draft modernizes the original Device/Product/Order model.

## Identity
- User
- Role
- Address
- Seller
- SellerMember

## Catalogue
- Category
- Brand
- CatalogModel
- Variant
- ProductImage

## Marketplace inventory
- SellerListing
- InventoryUnit
- DeviceDiagnostic
- GradeEvidence

The catalogue describes what a device is. A SellerListing describes a seller's commercial offer. An InventoryUnit describes the actual physical unit, including identifiers and condition.

## Commerce
- Cart
- CartItem
- Order
- OrderLine
- SellerSuborder
- Payment
- Refund
- MarketplaceFee
- SellerPayout

An Order may contain items from more than one seller. SellerSuborder isolates fulfilment and settlement per seller.

## Fulfilment and after-sales
- Shipment
- TrackingEvent
- Return
- WarrantyClaim
- Review

## Trade-in
- TradeInQuote
- TradeInDevice
- TradeInShipment
- Inspection
- Requote
- TradeInPayout

Trade-in is modeled as its own lifecycle rather than as a normal marketplace sale.

## Audit/security conventions
Primary keys, created/updated timestamps, appropriate soft-delete/status history, uniqueness constraints for identifiers, and auditable state transitions will be defined in the executable schema.
