# Qwikshelf - Developer Handover & Status Report

## Project Overview
Qwikshelf is an enterprise-grade Dairy ERP (Enterprise Resource Planning) system and integrated D2C (Direct-to-Consumer) storefront. It handles complex multi-warehouse inventory, supplier/customer CRMs, spatial delivery logistics, and offline-capable Point of Sale operations.

## Architecture & Technology Stack
*   **Backend:** Go (Golang) using the Gin web framework. Clean Architecture pattern (Domain -> Application -> Adapter).
*   **Frontend:** React (Vite, TypeScript), Tailwind CSS, `shadcn/ui`, `lucide-react`, React Router, Zustand for state.
*   **Database:** PostgreSQL with the **PostGIS** extension enabled for complex spatial/boundary tracking.
*   **Migrations:** Managed via `golang-migrate`.
*   **Infrastructure:** Dockerized via `docker-compose.yml`

---

## Completed Modules (Production Ready)

### 1. Core Administration & Security
*   **Authentication:** JWT and Session-based login systems.
*   **RBAC (Role-Based Access Control):** Granular permissions for defining roles (Admin, Cashier, Driver, Customer).

### 2. Catalog & Inventory Management
*   **Products & Variants:** Hierarchical products with multiple variants, featuring dynamic conversion factors.
*   **Warehousing:** Multi-warehouse architecture. Real-time stock counting, discrepancy tracking, and manual override capabilities.

### 3. Point of Sale (POS)
*   Tablet and Mobile-optimized cashier terminal.
*   Real-time stock depletion and verification (preventing overselling).
*   Quick-add variants and complex cart recalculations.

### 4. Logistics & Spatial Mapping (PostGIS)
*   **Serviceability Routing:** Delivery zones defined by geographic Polygons (GeoJSON) and raw Pincodes.
*   **Nominatim API:** Integrated reverse-geocoding to pinpoint physical addresses on visual maps in the UI.

### 5. Supplier Relationship Management
*   Full supplier CRM tracking contact info, active zones, and raw GPS coordinates for milk procurement.

### 6. Customer Relationship Management (CRM)
*   **Enterprise Tracking:** Manages B2B/B2C accounts, Authorized Credit Limits ("Khata"), Payment Terms, and internal specific Delivery/Dispatch instructions.
*   **360-Degree Profile:** Advanced analytics dashboard for each customer displaying their lifetime **Billing History** (every POS receipt) and **Product Footprint** (exact quantities and revenue yielded per variant).

### 7. D2C Storefront (Consumer Facing)
*   **Internationalization (i18n):** Configured with `next-intl` to support localized languages natively (English/Hindi).

---

## Currently Pending / Roadmap Operations

1.  **Route Management Engine (Phase 26):** Transitioning free-text delivery zones into a relational `delivery_routes` manifest system. This will allow generating specifically sequenced Stop Numbers for delivery truck dispatchers.
2.  **Payment Gateway (Phase 11):** Stripe implementation for the D2C checkout process.
3.  **Wishlists (Phase 10):** Allowing D2C customers to save products.

---

## 🛠 Developer Notes for Modifying the System

*   **Database Changes:** Never edit PostgreSQL tables directly. Always create a new sequential file in `api/migrations/` (e.g. `017_route_management.sql`) and run `make db-up` to apply them.
*   **Spatial Data:** If you are touching `zone_id`, `latitude`, or `longitude`, remember that the database uses a Geometry Trigger to automatically construct standard PostGIS point data. 
*   **Clean Architecture:** If adding a new feature (like "Routes"), follow the structural paradigm:
    1. Define Model in `domain/entity/`
    2. Define DB Operations in `adapter/secondary/postgres/`
    3. Define Business Logic in `application/service/`
    4. Expose HTTP Endpoints in `adapter/primary/http/handler/`
