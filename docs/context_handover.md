# Antigravity Context Handover - QwikShelf Project

This document provides a critical state-of-the-union for the QwikShelf project. Open this file first when starting a new chat session to regain full context.

## 📌 Project Architecture
- **Purpose**: Quick commerce D2C Storefront for fresh dairy products.
- **Backend**: Go (Gin Gonic) using a Hexagonal-ish architecture (Entities, Repositories, Services, Handlers).
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, React Query.
- **Database**: PostgreSQL (using `pgxpool` for connection pooling).

## ✅ Current Progress (As of March 2026)

### Phase 8: Internationalization (COMPLETED)
- Fully localized in **English (en)** and **Hindi (hi)** using `next-intl`.
- Components covered: Navbar, Hero, Auth, Account, Home.

### Phase 9: Serviceability (IN PROGRESS)
- **Status**: Backend refactor for Zone-Based system is **COMPLETED**.
- **Database**: PostgreSQL with **PostGIS** enabled (PG17 recommended).
- **Recent Pivot**: We successfully moved from flat pincodes to a **Zone-based system** with spatial GeoJSON mapping.
- **Tools**: `cmd/seed-pincodes` is ready to load area boundaries.

## 🛠 Tech Stack Details
- **State Mgmt**: Zustand (Cart, Auth, Location/Pincode).
- **API Communication**: Axios-based custom client in `src/lib/api`.
- **Database Connection**: Managed via `internal/adapter/secondary/postgres/connection.go`.

## 📋 Ongoing Discussions
1.  **Zone refactoring**: `delivery_zones` will hold delivery charges, min order amounts, and warehouse IDs. `serviceable_pincodes` will map to these zones.
2.  **GeoJSON Storefront**: The storefront should be able to display the delivery boundary (Polygon) for a selected pincode for better UI feedback.
3.  **Distance Calculations**: Shifting from simple lookups to `ST_DistanceSphere` or `ST_Contains` using PostGIS.

## 🚀 Future Roadmap
- **Phase 10**: Wishlist implementation.
- **Phase 11**: Stripe Payment integration.
- **Phase 12**: Order Tracking & Notifications.

## 🔗 Key Artifacts
- [task.md](file:///Users/oscarmild/.gemini/antigravity/brain/54805fa0-5fed-493f-b16b-3a95bf47e026/task.md)
- [implementation_plan.md](file:///Users/oscarmild/.gemini/antigravity/brain/54805fa0-5fed-493f-b16b-3a95bf47e026/implementation_plan.md)
- [zone_serviceability_plan.md](file:///Users/oscarmild/.gemini/antigravity/brain/54805fa0-5fed-493f-b16b-3a95bf47e026/zone_serviceability_plan.md)
