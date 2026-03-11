# QwikShelf Project Overview

This document provides a comprehensive overview of the QwikShelf D2C (Direct-to-Consumer) platform, summarizing the modules developed to date and the planned phases for future expansion.

## 🚀 Developed Modules

### 1. Core Authentication & Authorization
- **JWT-based Authentication**: Secure session management using JSON Web Tokens.
- **RBAC (Role-Based Access Control)**: Granular permission system with support for both role-level and direct user-level permissions.
- **Security**: Password hashing using BCrypt and middleware-level protection for API routes.

### 2. Product & Catalog Management
- **Hierarchy**: Support for Categories, Product Families, and Product Variants.
- **Unit Handling**: Unit conversion factors and conversion between different packaging (e.g., Ltr to ML).
- **Public API**: Highly optimized endpoints for catalog browsing on the storefront.

### 3. Inventory & Warehouse System
- **Multi-Warehouse Support**: Manage stock across different physical locations.
- **Stock Operations**: Support for inventory adjustments, warehouse transfers, and real-time stock tracking.
- **Serviceability**: Linked pincodes to specific warehouses for hyper-local delivery.

### 4. Procurement & Supplier Management
- **Supplier Directory**: Detailed supplier profiles and variant mapping.
- **Purchase Orders**: Manage the procurement lifecycle from order creation to item receiving into inventory.

### 5. Sales & Storefront
- **Point of Sale (POS)**: Admin-facing interface for recording offline sales.
- **D2C Storefront**: Modern Next.js 14 frontend with App Router, Tailwind CSS, and Framer Motion animations.
- **i18n (Internationalization)**: Full support for English (`en`) and Hindi (`hi`).
- **Cart System**: Persistent client-side state using Zustand.

### 6. Serviceability & Hyper-local Delivery
- **Pincode Verification**: Automated check to ensure delivery is available in the user's area.
- **Dynamic Delivery Charges**: Area-based shipping cost calculation.
- **Warehouse Mapping**: Intelligent routing of orders to the nearest serviceable warehouse.

---

## 📅 Roadmap & Pending Phases

### Phase 10: Wishlist Functionality
- **Objective**: Allow customers to save items for future purchase.
- **Backend**: New `wishlists` table and management service.
- **Frontend**: Heart-icon integration on product cards and a dedicated Wishlist page.

### Phase 11: Payment Gateway Integration (Stripe)
- **Objective**: Enable secure, real-world online payments.
- **Scope**: Integration with Stripe Elements, webhook handling for order status updates, and transaction logging.

### Phase 12: Advanced Order Tracking & Notifications
- **Objective**: Provide users with real-time updates on their order lifecycle.
- **Scope**: Email/SMS notifications and a visual order progress tracker in the user account.

### Phase 13: Admin Dashboard V2 (Deep Analytics)
- **Objective**: Provide business insights for the platform owner.
- **Scope**: Visual charts for sales trends, inventory turnover reports, and customer acquisition metrics.

---

## 🛠 Tech Stack
- **Backend**: Go (Gin Gonic, pgxpool, PostgreSQL).
- **Frontend**: Next.js 14, TypeScript, Zustand, React Query, Tailwind CSS.
- **Documentation**: Swagger/OpenAPI for backend, Design Specs for frontend.
