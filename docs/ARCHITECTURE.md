# Btech Market V2 Architecture

## Objective
Build a modern, maintainable recommerce marketplace for mobile devices and electronics while preserving the strongest concepts from the original Btech Market design.

## Product surfaces
1. Customer storefront — catalogue, search/filtering, product detail, cart, checkout, account, order tracking and reviews.
2. Seller Center — onboarding, listings, physical-device inventory, orders, fulfilment and performance.
3. Btech Admin — catalogue, sellers, orders, disputes, trade-ins and marketplace controls.
4. Trade-in — quote, shipment, inspection, requote/acceptance and payout.

## Architecture principles
- Start as a modular monolith; split services only when scale or operational boundaries justify it.
- TypeScript end-to-end where practical.
- PostgreSQL as the system of record.
- Managed authentication, payments, storage, email and observability.
- API/business logic separated from presentation components.
- Mobile-first and accessible.
- Never store secrets in Git.

## Proposed application stack
- Next.js + React + TypeScript
- Tailwind CSS
- PostgreSQL
- ORM/schema layer selected during implementation
- Managed object storage/CDN for images
- Marketplace-capable payment provider
- Shipping/tracking API
- Transactional email provider

## Core domain model
CatalogModel -> Variant -> SellerListing -> InventoryUnit

An InventoryUnit represents a physical device and may hold IMEI/serial, carrier/lock state, grade, battery health and diagnostic evidence. Orders use OrderLines rather than attaching an order directly to a product. Marketplace orders may create seller-specific suborders.

Additional domains: User/Role, Seller, Address, Payment/Refund, SellerPayout/Fee, Shipment/TrackingEvent, Return, WarrantyClaim, Review, TradeInQuote, TradeInDevice, Inspection and TradeInPayout.

## Delivery strategy
Phase 1 proves an end-to-end transaction: storefront -> product -> cart -> account -> checkout, plus seller login -> listing -> inventory -> order. Trade-in and advanced marketplace features follow after the transaction core is stable.
