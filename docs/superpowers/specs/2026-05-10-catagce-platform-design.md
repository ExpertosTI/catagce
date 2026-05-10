# Catagce Platform Design

Date: 2026-05-10
Status: Draft proposed by Copilot, ready for user review
Project: Catagce
Workspace: QuickCtgo

## 1. Executive Summary

Catagce is a commercial platform for sellers who need to turn warehouse inventory into a modern, fast and interactive catalog sales channel. The product combines inventory control, assisted product capture, branded catalog generation, interactive PDF export and a zero-login ordering web flow.

The design is based on clean architecture, a relational data model and a modular execution strategy. The system starts as a modular monolith with isolated workers for heavy jobs, while keeping explicit domain boundaries so it can evolve into separate services only when scale justifies it.

The main business promise is simple:

1. The seller receives stock and registers it in the correct unit of measure.
2. The seller captures or updates products with clean, catalog-ready images.
3. The seller builds a branded catalog in minutes.
4. The system generates a premium PDF and a linked web experience.
5. Buyers place orders without registration.
6. Orders reserve stock immediately and notify the seller.

## 2. Product Vision

Catagce should become the operating system for lightweight wholesale and assisted B2B catalog sales.

The product is not only a catalog builder. It is a full commercial flow:

1. Product onboarding
2. Inventory normalization
3. Catalog publishing
4. Order intake
5. Stock synchronization
6. Seller notification and follow-up

The target experience is fast enough for warehouse use, polished enough for client-facing catalogs and robust enough for real inventory operations.

## 3. Product Goals

### 3.1 Business goals

1. Reduce the time required to create a sellable catalog from days to minutes.
2. Increase conversion from catalog distribution to confirmed order.
3. Eliminate inventory ambiguity across units such as boxes, dozens and units.
4. Give small and medium sellers a modern commerce workflow without forcing buyer registration.

### 3.2 Product goals

1. Let a seller onboard inventory quickly from a mobile device.
2. Keep stock trustworthy by modeling unit conversion correctly.
3. Publish catalogs with strong branding and premium presentation.
4. Make ordering frictionless from PDF, QR and shared links.
5. Keep the seller informed in real time as orders arrive.

### 3.3 Non-goals for the first platform cycle

1. Full accounting or ERP replacement.
2. Complex procurement workflows.
3. Marketplace behavior between unrelated sellers.
4. Advanced CRM suites beyond lightweight customer context.
5. Deep financial reconciliation.

## 4. Primary Users

### 4.1 Seller owner

Needs:

1. Control stock across one or more warehouses.
2. Build catalogs quickly.
3. Share branded PDFs by WhatsApp.
4. Receive orders and react fast.

### 4.2 Warehouse operator

Needs:

1. Scan and count stock fast.
2. Register entries, exits and adjustments.
3. Avoid typing-heavy workflows.

### 4.3 Catalog buyer

Needs:

1. Open a product page instantly.
2. Order without account creation.
3. Understand units, pricing and availability.
4. Confirm by WhatsApp with minimal friction.

## 5. Design Principles

1. Clean architecture first. Domain rules stay independent of UI, databases and vendors.
2. Inventory integrity over convenience. Stock changes only through explicit business use cases.
3. Fast mobile-first operations. Warehouse workflows must minimize taps and typing.
4. Publish once, sell everywhere. PDF, QR and web must resolve to the same published catalog version.
5. Infrastructure behind ports. OCR, background removal, WhatsApp and render engines stay replaceable.
6. Multi-tenant from day one. Every seller is isolated in data, branding and operations.
7. Observability built in. Every critical flow must be measurable and auditable.

## 6. Scope Definition

### 6.1 Core scope

1. Seller identity and branding
2. Product master data and media
3. Unit of measure and conversion logic
4. Inventory by warehouse
5. Stock movement ledger and audit
6. Catalog creation and publication
7. Interactive PDF generation
8. Zero-login web order intake
9. Push and WhatsApp follow-up

### 6.2 Extended scope

1. OCR-assisted product onboarding
2. AI background removal for catalog-grade photos
3. Barcode and high-speed scan workflows
4. Operational analytics
5. Offline-friendly mobile behavior for warehouse use

## 7. Recommended System Architecture

## 7.1 Architecture choice

The recommended architecture is a modular monolith with specialized workers.

Why this is the right decision:

1. It keeps transactional consistency strong for inventory, reservations and orders.
2. It avoids premature distributed-system complexity.
3. It still isolates expensive workloads such as PDF rendering and image processing.
4. It creates clean service boundaries that can later be extracted without rewriting domain rules.

## 7.2 High-level components

1. Mobile seller app in Flutter
2. Buyer web ordering app in a server-rendered web stack
3. Core API in NestJS
4. Worker for media processing and OCR
5. Worker for PDF/catalog rendering
6. Worker for notifications and messaging
7. PostgreSQL database on Supabase
8. Object storage on Cloudflare R2
9. Push and messaging integrations

## 7.3 Logical architecture layers

### Domain layer

Contains:

1. Entities
2. Value objects
3. Aggregates
4. Domain services
5. Domain events
6. Business invariants

Rules here must not depend on framework, database or third-party APIs.

### Application layer

Contains:

1. Use cases
2. Command and query handlers
3. Transaction orchestration
4. Authorization checks
5. Domain event publishing

### Interface layer

Contains:

1. REST or RPC controllers
2. Mobile-facing endpoints
3. Public order endpoints
4. DTO validation
5. Serialization

### Infrastructure layer

Contains:

1. Database repositories
2. Queue adapters
3. OCR provider adapter
4. Background removal adapter
5. Push adapter
6. WhatsApp adapter
7. Storage adapter
8. Render engine adapter

## 7.4 Physical execution model

Initial runtime layout:

1. API service
2. Worker media service
3. Worker render service
4. Worker notifications service
5. Postgres database
6. Redis or queue backing service for jobs and ephemeral state where needed

This setup gives strong domain cohesion while separating latency-sensitive operations from user actions.

## 7.5 Public read-path strategy

The public buyer flow must not depend on live administrative queries.

Design decisions:

1. Every catalog publication generates a public read model optimized for catalog and product landing pages.
2. Publication assets and static media are served from object storage through CDN caching.
3. Public pages resolve a publication token or slug to a precomputed publication snapshot.
4. Publication invalidation happens only when a new publication version is released, never by mutating a published one.
5. Buyer-facing reads should prefer cacheable publication payloads over live joins into mutable seller tables.

This design is required to meet mobile load targets and to isolate public traffic from seller back-office workloads.

## 7.6 Tenant enforcement model

Multi-tenancy is not only an application concern. It is enforced across all execution paths.

Enforcement rules:

1. Every tenant-owned table includes seller_id as part of its access boundary.
2. Seller-authenticated reads and writes are protected by row-level security and seller-scoped application authorization.
3. Composite indexes for operational tables always include seller_id first where tenant partitioning is relevant.
4. Worker jobs must carry seller_id in their payload and re-validate tenant ownership before loading or mutating records.
5. Object storage uses seller-scoped key prefixes so asset access cannot drift across tenants.
6. Public ordering endpoints never accept raw seller identifiers from the client; they resolve signed publication tokens to the owning seller internally.
7. Audit and integration logs must preserve seller context on every entry.

## 8. Proposed Repository Structure

This structure is the recommended implementation target:

```text
apps/
  seller-mobile/
  buyer-web/
  api/
workers/
  media-processor/
  catalog-renderer/
  notifications/
packages/
  domain/
    identity/
    products/
    inventory/
    pricing/
    catalogs/
    ordering/
    notifications/
    audit/
  application/
    identity/
    products/
    inventory/
    pricing/
    catalogs/
    ordering/
    notifications/
  infrastructure/
    persistence/
    storage/
    messaging/
    media/
    rendering/
  contracts/
  design-system/
docs/
  superpowers/
    specs/
```

Boundary rules:

1. apps/api depends on packages/application, packages/contracts and infrastructure adapters.
2. Each bounded context keeps its own domain and application modules, avoiding a shared god-domain.
3. packages/application depends on packages/domain only.
4. packages/domain depends on nothing external.
5. workers depend on application contracts and infrastructure adapters.
6. UI applications consume contracts, never domain internals.
7. Persistence mappings, repositories and migrations must keep bounded-context ownership even when they reuse shared infrastructure primitives.

## 9. Core Domain Design

## 9.1 Bounded contexts

The platform is divided into these bounded contexts:

1. Identity and Tenant
2. Catalog Product Management
3. Inventory and Warehouse Operations
4. Pricing and UOM
5. Catalog Publishing
6. Ordering
7. Notifications
8. Analytics and Audit

## 9.2 Aggregate ownership

1. Seller owns branding, settings and tenant context.
2. Product owns catalog-ready metadata, variants and media references.
3. Stock aggregate owns available quantities per warehouse and base unit.
4. Catalog aggregate owns published product composition and version snapshots.
5. Order aggregate owns order state and reservation linkage.

## 9.3 Domain invariants

1. Every product has exactly one base unit of measure.
2. Every alternative unit maps to a deterministic conversion factor to base units.
3. Stock can never become negative through a confirmed operation.
4. A published catalog version is immutable.
5. An order never decrements stock directly without a reservation or explicit inventory movement.
6. Every stock-affecting action must create an auditable movement record.
7. A buyer order must always point to a published catalog version or a valid public product link.

## 9.4 Fulfillment and allocation policy

The system must close how warehouse allocation works before public orders exist.

Allocation rules:

1. Every catalog publication declares a fulfillment scope.
2. In MVP, the default mode is a primary warehouse per publication to keep reservation logic deterministic.
3. Multi-warehouse allocation can be enabled by seller policy using a priority list of eligible warehouses.
4. Reservation is created at allocation-line level, not only at whole-order level.
5. Partial confirmation is allowed only when order item allocations make confirmed and rejected quantities explicit.

This prevents ambiguous warehouse behavior in a multi-warehouse seller setup.

## 10. Data Architecture

## 10.1 Why relational design is mandatory

The platform has inventory integrity constraints, versioned publications and traceable order state. A relational schema is the right choice because:

1. Unit conversion needs consistency and transactional enforcement.
2. Stock reservations and movements need reliable locking semantics.
3. Catalog publication needs versioning and reproducibility.
4. Auditability needs strong referential integrity.

## 10.2 Core data model

### Tenant and identity tables

1. sellers
2. seller_users
3. seller_branding
4. user_roles
5. seller_settings

### Product and media tables

1. products
2. product_variants
3. product_attributes
4. product_attribute_values
5. product_media
6. product_barcodes

### UOM and pricing tables

1. uoms
2. product_uom_conversions
3. price_lists
4. price_list_items

### Warehouse and stock tables

1. warehouses
2. stock_levels
3. stock_movements
4. stock_reservations
5. stock_count_sessions
6. stock_count_items

### Catalog tables

1. catalogs
2. catalog_items
3. catalog_templates
4. catalog_publications
5. catalog_publication_assets

### Ordering tables

1. orders
2. order_items
3. order_item_allocations
4. order_events
5. buyer_contacts

### Cross-cutting tables

1. notifications
2. integration_logs
3. audit_logs
4. job_runs

## 10.3 Unit of measure model

This is one of the most important business rules in the whole platform.

Each product stores:

1. base_uom_id
2. sellable_uom_set
3. conversion definitions

Example:

1. Base unit: unit
2. Dozen factor: 12 base units
3. Box factor: 144 base units

If the seller registers 50 boxes, the stored quantity in stock is 7200 units.

If the buyer orders 1 dozen, the system reserves 12 base units.

If the UI needs to display stock in boxes, it computes display quantities from base stock using the same conversion table.

This ensures:

1. Mathematical consistency
2. Simpler stock accounting
3. Reliable aggregation across warehouses

Implementation rules for UOM:

1. Base quantities and conversion factors use fixed numeric precision, never floating-point types.
2. Quantities are stored with enough decimal scale to support fractional units where the business allows them.
3. Every sellable unit defines minimum order quantity and increment rules.
4. Rounding rules are explicit and product-specific where needed.
5. By default, closed packaging such as boxes cannot be ordered fractionally unless a product rule explicitly allows it.
6. Price snapshots must capture the unit context used by the buyer, not only the converted base quantity.

## 10.4 Stock tables behavior

### stock_levels

Suggested fields:

1. seller_id
2. warehouse_id
3. product_id
4. variant_id nullable
5. on_hand_base
6. reserved_base
7. available_base
8. minimum_threshold_base
9. updated_at

### stock_movements

Suggested fields:

1. movement_id
2. seller_id
3. warehouse_id
4. product_id
5. variant_id nullable
6. movement_type
7. quantity_base_delta
8. source_uom_id
9. source_quantity
10. reason_code
11. actor_user_id
12. reference_type
13. reference_id
14. created_at

movement_type values:

1. inbound
2. outbound
3. adjustment
4. transfer_out
5. transfer_in
6. reservation_hold
7. reservation_release
8. order_confirmed
9. count_reconcile

### stock_reservations

Suggested fields:

1. reservation_id
2. seller_id
3. order_id
4. warehouse_id
5. product_id
6. variant_id nullable
7. reserved_base
8. status
9. expires_at nullable
10. created_at

status values:

1. active
2. released
3. consumed
4. expired

## 10.4.1 Concurrency and reservation strategy

The reservation engine is part of the transactional core and must be deterministic.

Design decisions:

1. Public order submission requires an idempotency key generated client-side or server-issued at form load.
2. Reservation happens inside a single database transaction.
3. Candidate stock rows are locked using database row-level locking before available quantity is recalculated.
4. Reservation writes update both stock_reservations and stock_levels in the same transaction.
5. If reservation cannot be satisfied, the order is still stored but marked for seller review without confirmed reservation lines.
6. Reservation expiration is handled by scheduled cleanup jobs that release held stock through the same inventory use cases.
7. Retries must be safe because duplicate submissions resolve against the same idempotency key.
8. Lock acquisition order must be deterministic by seller_id, warehouse_id, product_id and variant_id to reduce deadlock risk.
9. Idempotency keys are unique per seller and public submission channel within a defined validity window, and duplicate submissions must return the original order result.

## 10.5 Catalog publication model

Catalog publication must be immutable.

Each publication stores:

1. seller branding snapshot
2. product selection snapshot
3. pricing snapshot
4. template selection
5. valid_from and valid_until
6. public navigation slug and signed order token metadata
7. PDF asset references
8. web-public presentation metadata
9. publication item snapshot records including product title, variant label, display media, unit options and commercial prices

This protects the customer-facing experience from changes happening after distribution.

## 10.5.1 Public identifier policy

Public identifiers have two different responsibilities and must not be conflated.

1. The slug is a human-friendly navigation identifier for public catalog landing pages.
2. Order submission accepts only a signed publication token resolved server-side.
3. The signed token encapsulates or resolves the publication version and seller context without exposing raw tenant identifiers.
4. Public pages may start from a slug, but all write operations must use signed identifiers.

## 10.6 Order model

Order states:

1. draft_capture
2. submitted
3. reserved
4. pending_seller_review
5. confirmed
6. partially_confirmed
7. rejected
8. cancelled
9. expired

Order rules:

1. Public web orders start as submitted.
2. Reservation happens immediately if stock exists.
3. Seller confirms or adjusts the order.
4. Confirmation converts reservation into a stock movement.
5. Rejection or expiration releases the reservation.

Required order snapshot fields:

1. publication_id and publication_version reference
2. publication_item_snapshot reference for each ordered line
3. buyer-requested unit of measure
4. conversion factor applied at order time
5. unit price snapshot
6. currency snapshot
7. discount or pricing rule snapshot if applicable
8. minimum increment rule snapshot used for validation
9. idempotency key for public submission

Allocation behavior:

1. Each order item can contain one or more allocation lines.
2. Allocation lines point to the warehouse that reserved stock.
3. Partial confirmation updates allocation lines explicitly so confirmed, rejected and released quantities remain auditable.
4. Seller review can reallocate lines before final confirmation, but always through inventory-aware use cases.

## 11. Functional Modules

## 11.1 Seller identity and branding

Features:

1. Seller profile
2. Logo upload
3. Color palette
4. PDF style preferences
5. Web ordering page branding

Purpose:

1. Preserve seller identity across PDF and web channels.
2. Make catalogs look premium without requiring design expertise.

## 11.2 Product management

Features:

1. Product master record
2. Variant handling by size, color, material and other attributes
3. SKU and barcode storage
4. Product media gallery
5. Search and filtering

Special behavior:

1. Attribute selection should rely on fast chips and presets, not slow nested dropdown flows.
2. Products can be catalog-enabled or inventory-only.

## 11.3 Intelligent camera and product cleanup

Features:

1. Camera capture flow in mobile app
2. Background removal
3. Auto-crop and normalization
4. OCR on labels or packaging
5. Suggested name and SKU completion

Implementation rule:

1. AI output is assistive, never silently authoritative.
2. Users must confirm suggested metadata before product creation is finalized.

## 11.4 Warehouse operations

Features:

1. Warehouse creation and assignment
2. Entry registration
3. Exit registration
4. Transfers
5. Adjustments
6. Stock count mode
7. Low stock alerting
8. Traffic-light stock dashboard

## 11.5 Catalog builder

Features:

1. Product selection by filters or manual pick
2. Template selection
3. Catalog naming and validity range
4. Pricing snapshot selection
5. Seller branding injection
6. Preview before publication

## 11.6 Interactive PDF engine

Features:

1. HTML/CSS template rendering
2. High-resolution PDF generation
3. Product-level order links
4. Catalog QR on cover
5. Regenerate in one click
6. Track publication assets

Important decision:

1. PDF generation must happen asynchronously via job queue.
2. The user sees job status and receives completion feedback.

## 11.7 Buyer web ordering flow

Features:

1. Zero-login order intake
2. Product landing from PDF or QR
3. Quantity selector in valid sellable units
4. Buyer name and WhatsApp collection
5. Submit order in seconds

Design rule:

1. This flow must optimize for speed and trust.
2. Every unnecessary field should be removed.

## 11.8 Notifications and messaging

Features:

1. Seller push notifications
2. In-app alerts
3. WhatsApp confirmation message generation
4. Order status notifications

## 11.9 Analytics and operations

Features:

1. Catalog open rate
2. Link click-through rate
3. Order conversion rate
4. Best performing products
5. Low-stock risk indicators
6. Time-to-confirm metrics

## 12. Core User Flows

## 12.1 Warehouse intake happy path

1. Seller receives 50 boxes of shoes.
2. Seller scans one box or product barcode.
3. Seller enters quantity as 50 boxes.
4. System converts to base units automatically.
5. Inventory is updated for the chosen warehouse.

## 12.2 Product onboarding happy path

1. Seller takes a product photo inside a warehouse.
2. System removes the background and normalizes the image.
3. OCR extracts candidate text from label or packaging.
4. Seller confirms or edits fields.
5. Product becomes catalog-ready.

## 12.3 Catalog publishing happy path

1. Seller selects best products.
2. Seller chooses template and date validity.
3. Seller publishes a catalog version.
4. Render worker produces PDF and public web assets.
5. Seller shares PDF through WhatsApp.

## 12.4 Buyer ordering happy path

1. Buyer opens the PDF.
2. Buyer taps a product CTA or scans the catalog QR.
3. Buyer lands on a lightweight order page.
4. Buyer chooses quantity and unit.
5. Buyer enters name and WhatsApp.
6. System creates the order and reserves stock.
7. Seller receives a notification.

## 12.5 Seller confirmation happy path

1. Seller opens incoming orders in the mobile app.
2. Seller reviews requested quantities and stock impact.
3. Seller confirms or adjusts the order.
4. Stock reservation becomes a confirmed movement.
5. Buyer receives confirmation prompt through WhatsApp.

## 13. API and Integration Boundaries

## 13.1 Internal application services

1. Seller service
2. Product service
3. Inventory service
4. Catalog service
5. Order service
6. Notification service
7. Asset service

## 13.2 External provider ports

1. ImageCleanupProvider
2. OcrProvider
3. PdfRenderProvider
4. ObjectStorageProvider
5. PushNotificationProvider
6. MessagingProvider

All providers are accessed through interfaces so infrastructure can change without touching business rules.

## 13.3 Public endpoints

Public endpoints must remain minimal and secure:

1. Open published catalog landing
2. Open product order page
3. Submit order
4. Read limited publication metadata

These endpoints must never expose raw inventory internals or seller administration data.

Implementation constraints:

1. Public read endpoints may resolve a catalog by slug or signed identifier, but all write endpoints accept only signed publication identifiers.
2. Public responses are served from publication read models, not mutable seller-management tables.
3. Submit order uses rate limiting, idempotency validation and abuse monitoring.
4. Public requests log seller context internally after slug or token resolution, never from direct client-provided tenant ids.

## 14. Security and Multi-Tenancy

## 14.1 Tenant isolation

Requirements:

1. Every seller has isolated data access.
2. Queries and indexes must include seller boundaries.
3. Asset URLs must be signed or permissioned.
4. Seller-authenticated access uses row-level security and server-side tenant context validation.
5. Worker execution revalidates seller ownership before side effects.
6. Public publication tokens map to seller scope server-side and cannot be forged by passing seller ids directly.

## 14.2 Public ordering safeguards

1. Rate limiting on public order endpoints.
2. Signed publication tokens for all write operations.
3. Bot mitigation where needed.
4. Minimal PII collection.
5. Audit trail for order source and submission context.
6. Idempotency keys to prevent accidental duplicate order creation.
7. Reservation-safe transaction boundaries before stock is affected.

## 14.3 Operational security

1. Role-based access in seller backend.
2. Immutable audit logs for stock and order actions.
3. Secret management for third-party providers.
4. Separate environments for dev, staging and production.

## 15. Performance and Non-Functional Requirements

## 15.1 Performance targets

1. Product detail load under 2 seconds on mobile web.
2. Order form submission under 1 second server processing in nominal conditions.
3. Catalog publication request accepted in under 1 second.
4. PDF generation under 20 seconds for standard catalogs.
5. Product onboarding interaction smooth at warehouse conditions.

Performance design commitments:

1. Public catalog and product pages use precomputed publication read models.
2. Static catalog media is distributed through CDN-backed object storage.
3. Publication invalidation happens only on version changes, which keeps cache behavior simple.
4. Expensive joins on live inventory tables are not allowed in public read paths.

## 15.2 Reliability targets

1. No stock corruption under concurrent ordering.
2. Idempotent order submission protections.
3. Retryable jobs for render and notifications.
4. Recoverable media-processing failures.

## 15.3 Usability targets

1. Seller can register stock intake in under 30 seconds per line item.
2. Buyer can submit order in under 60 seconds without login.
3. Catalog creation flow should require minimal training.

## 16. UI and UX Direction

The design language requested is modern, light, clean and commercially polished.

### Seller experience principles

1. High contrast for warehouse environments.
2. Large touch targets.
3. Fast visual states for low stock, pending orders and publication jobs.
4. Gesture-enabled actions only where they improve speed without harming discoverability.

### Buyer experience principles

1. Immediate trust with brand presence and clear pricing.
2. Minimal fields.
3. Mobile-first layout for WhatsApp-opened links.
4. Clear unit selectors to prevent ordering mistakes.

### Visual direction

1. Clean and premium rather than decorative.
2. Glass and depth effects only if performance and readability remain strong.
3. Dark mode optional and automatic where appropriate, but not at the cost of warehouse readability.

## 17. Roadmap by Phase

## 17.1 Phase 0: Foundation

Target duration: 2 weeks

Deliverables:

1. Repository structure
2. CI and deployment foundations
3. Tenant model
4. Authentication and roles
5. Base design tokens and shared contracts
6. Database bootstrap and migration strategy
7. Observability baseline
8. Multi-tenant enforcement baseline
9. Public-token and idempotency design for future ordering

Exit criteria:

1. Team can build safely on stable foundations.
2. Core domain boundaries are implemented as packages or modules.

## 17.2 Phase 1: Inventory Core

Target duration: 4 weeks

Deliverables:

1. Warehouses
2. Products
3. Variants
4. UOM and conversion rules
5. Stock levels
6. Stock movement ledger
7. Traffic-light stock dashboard

Exit criteria:

1. Seller can register inventory correctly across warehouses.
2. Stock can be queried and trusted.

## 17.3 Phase 2: Warehouse Operations

Target duration: 3 weeks

Deliverables:

1. Entry flow
2. Exit flow
3. Adjustments
4. Transfers
5. Count mode
6. Movement reasons and actor tracking

Exit criteria:

1. Real warehouse daily operations are supported.

## 17.4 Phase 3: Intelligent Product Capture

Target duration: 4 weeks

Deliverables:

1. Camera capture flow
2. Background removal integration
3. OCR integration
4. Suggested metadata UX
5. Product media normalization

Exit criteria:

1. Seller can create catalog-ready products quickly from a mobile device.

## 17.5 Phase 4: Catalog Builder

Target duration: 4 weeks

Deliverables:

1. Catalog creation flow
2. Template engine inputs
3. Pricing snapshot support
4. Catalog preview
5. Publication versioning

Exit criteria:

1. Seller can prepare a catalog for publication with frozen version data.

## 17.6 Phase 5: Interactive PDF and Public Catalog

Target duration: 3 weeks

Deliverables:

1. PDF render queue
2. Cover QR generation
3. Product CTA links
4. Publication assets in storage
5. One-click regeneration
6. Public read models and cache invalidation strategy
7. Signed publication token lifecycle

Exit criteria:

1. Seller can share a premium PDF tied to valid public order entry points.

## 17.7 Phase 6: Zero-login Ordering

Target duration: 4 weeks

Deliverables:

1. Public product and catalog order pages
2. Minimal checkout flow
3. Reservation engine
4. Seller order inbox
5. Order state management
6. Public abuse controls, idempotency and rate limiting enabled before rollout

Exit criteria:

1. A buyer can order from the published catalog without account creation.
2. Stock impact is immediate and controlled.
3. Public ordering security gate is passed before exposure beyond controlled beta.

## 17.8 Phase 7: Notifications and Messaging

Target duration: 3 weeks

Deliverables:

1. Seller push notifications
2. In-app order alerts
3. WhatsApp follow-up message generation
4. Basic notification preferences

Exit criteria:

1. Sellers do not miss new orders.
2. Buyers have a clear next step after submitting an order.

## 17.9 Phase 8: Hardening and Launch

Target duration: 3 weeks

Deliverables:

1. Performance hardening
2. Error handling refinement
3. Retry and dead-letter policies
4. Backups and recovery drills
5. Security review
6. Staging to production rollout plan

Exit criteria:

1. Platform is production-ready for controlled launch.

Note:

Phase 8 is not the first time security appears. Public-surface safeguards are implemented before Phase 6 exposure, while Phase 8 is the final production hardening pass.

## 17.10 Phase 9: Optimization and Intelligence

Target duration: 4 weeks

Deliverables:

1. Analytics dashboards
2. Replenishment suggestions
3. Product performance insights
4. Catalog recommendation support
5. Conversion optimization tests

Exit criteria:

1. Platform improves seller outcomes beyond basic operations.

## 18. Milestones

1. Week 6: reliable inventory system in mobile operations
2. Week 13: assisted product onboarding with AI support
3. Week 20: publishable interactive catalog
4. Week 24: end-to-end order intake connected to stock
5. Week 30: launch-ready production baseline

## 19. Quality Strategy

## 19.1 Testing approach

1. Domain unit tests for UOM, reservations and order transitions
2. Application tests for use case orchestration
3. Contract tests for provider adapters
4. Integration tests for stock and order transactions
5. End-to-end tests for catalog publication and public ordering
6. Mobile UX validation for warehouse workflows

## 19.2 Critical cases to test first

1. Reserve stock from concurrent public orders
2. Release reservation on rejection or timeout
3. Regenerate PDF after price update through new publication version
4. OCR suggestion accepted and corrected by user
5. Transfer stock across warehouses without double-counting
6. Cross-tenant access attempts fail in API, workers and public token resolution
7. Duplicate public submits with the same idempotency key do not create duplicate orders
8. Partial confirmation preserves per-allocation auditability

## 20. Observability Strategy

Metrics to capture:

1. Catalog generation latency
2. Order submission success rate
3. Reservation conflict rate
4. Notification delivery success rate
5. Product onboarding completion time
6. Public page load performance

Structured logs for:

1. Stock movement creation
2. Order state transition
3. Render job lifecycle
4. Provider failures
5. Security events

## 21. Risks and Mitigations

## 21.1 Inventory inconsistency risk

Mitigation:

1. Use base-unit storage only.
2. Centralize all stock changes in inventory use cases.
3. Add concurrency-safe reservation behavior.

## 21.2 Third-party provider fragility

Mitigation:

1. Use provider ports and adapters.
2. Persist failed jobs for retry.
3. Allow provider replacement.

## 21.3 PDF complexity and visual drift

Mitigation:

1. Version templates.
2. Snapshot publication data.
3. Render asynchronously.

## 21.4 Buyer friction risk

Mitigation:

1. Keep order form minimal.
2. Measure drop-off.
3. Optimize mobile load time aggressively.

## 21.5 Overbuilding risk

Mitigation:

1. Ship by phase.
2. Keep first release focused on proven seller workflows.
3. Treat advanced intelligence as later optimization, not initial dependency.

## 22. Success Metrics

1. Product onboarding under 45 seconds for standard items
2. Catalog publication under 20 seconds for standard catalog size
3. Public order page load under 2 seconds in mobile conditions
4. Order submission completion under 60 seconds
5. Stock accuracy above 98 percent
6. Seller order response median under 10 minutes during operating hours

## 23. Initial Delivery Sequence

The practical build order should be:

1. Foundation and tenant model
2. Product model and UOM
3. Inventory and warehouse operations
4. Assisted media capture
5. Catalog publication model
6. Interactive PDF pipeline
7. Public ordering and reservations
8. Notifications and launch hardening

This order protects the core business truth first: inventory integrity and publication consistency.

## 24. Decisions Closed by This Design

1. Catagce is built as a modular monolith first, not as day-one microservices.
2. Inventory stores base-unit quantities and conversion metadata, not ambiguous mixed quantities.
3. Catalog publications are immutable snapshots.
4. Public ordering is zero-login and minimal friction.
5. Heavy jobs run asynchronously through workers.
6. Third-party AI and messaging integrations stay behind replaceable infrastructure adapters.

## 25. Future Extensions

Possible future additions after core launch:

1. Customer segmentation
2. Seller CRM notes
3. Suggested catalog assortments
4. Demand forecasting
5. Multi-language catalogs
6. Regional pricing and tax rules

## 26. Final Design Statement

Catagce is designed as a high-speed commercial operating platform that begins with trustworthy inventory and ends with fast order capture from interactive catalogs. The design intentionally prioritizes domain integrity, tenant isolation, publication immutability and user speed. This keeps the platform commercially useful in the short term and structurally extensible in the long term.

This document is the architecture and product-design baseline for implementation planning.