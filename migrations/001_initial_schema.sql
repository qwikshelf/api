-- +migrate Up
-- Creates all tables for the QwikShelf inventory management system

-- ====================
-- USERS & AUTHENTICATION
-- ====================

-- Permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Role permissions junction table
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role_id ON users(role_id);

-- ====================
-- WAREHOUSES
-- ====================

CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('store', 'factory', 'distribution_center')),
    address TEXT
);

CREATE INDEX idx_warehouses_type ON warehouses(type);

-- ====================
-- SUPPLIERS
-- ====================

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    location TEXT
);

-- ====================
-- PRODUCTS
-- ====================

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Product families table
CREATE TABLE product_families (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE INDEX idx_product_families_category_id ON product_families(category_id);

-- Product variants table
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES product_families(id),
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_manufactured BOOLEAN DEFAULT false
);

CREATE INDEX idx_product_variants_family_id ON product_variants(family_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode) WHERE barcode IS NOT NULL;

-- Supplier variants junction table
CREATE TABLE supplier_variants (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    agreed_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_preferred BOOLEAN DEFAULT false,
    UNIQUE(supplier_id, variant_id)
);

CREATE INDEX idx_supplier_variants_supplier_id ON supplier_variants(supplier_id);
CREATE INDEX idx_supplier_variants_variant_id ON supplier_variants(variant_id);

-- ====================
-- INVENTORY
-- ====================

-- Inventory levels table
CREATE TABLE inventory_levels (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,
    batch_number VARCHAR(100),
    expiry_date DATE,
    UNIQUE(warehouse_id, variant_id)
);

CREATE INDEX idx_inventory_levels_warehouse_id ON inventory_levels(warehouse_id);
CREATE INDEX idx_inventory_levels_variant_id ON inventory_levels(variant_id);
CREATE INDEX idx_inventory_levels_expiry_date ON inventory_levels(expiry_date) WHERE expiry_date IS NOT NULL;

-- Inventory transfers table
CREATE TABLE inventory_transfers (
    id SERIAL PRIMARY KEY,
    source_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    destination_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    authorized_by_user_id INTEGER NOT NULL REFERENCES users(id),
    transferred_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled'))
);

CREATE INDEX idx_inventory_transfers_source ON inventory_transfers(source_warehouse_id);
CREATE INDEX idx_inventory_transfers_destination ON inventory_transfers(destination_warehouse_id);
CREATE INDEX idx_inventory_transfers_status ON inventory_transfers(status);

-- Inventory transfer items table
CREATE TABLE inventory_transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity DECIMAL(12, 3) NOT NULL
);

CREATE INDEX idx_inventory_transfer_items_transfer_id ON inventory_transfer_items(transfer_id);

-- ====================
-- PROCUREMENT
-- ====================

CREATE TABLE procurements (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    ordered_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    expected_delivery DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'partial', 'received', 'cancelled'))
);

CREATE INDEX idx_procurements_supplier_id ON procurements(supplier_id);
CREATE INDEX idx_procurements_warehouse_id ON procurements(warehouse_id);
CREATE INDEX idx_procurements_status ON procurements(status);

CREATE TABLE procurement_items (
    id SERIAL PRIMARY KEY,
    procurement_id INTEGER NOT NULL REFERENCES procurements(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity_ordered DECIMAL(12, 3) NOT NULL,
    quantity_received DECIMAL(12, 3) DEFAULT 0,
    unit_cost DECIMAL(12, 2) NOT NULL
);

CREATE INDEX idx_procurement_items_procurement_id ON procurement_items(procurement_id);

-- ====================
-- PRODUCTION
-- ====================

CREATE TABLE production_runs (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    product_variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity_produced DECIMAL(12, 3) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_production_runs_warehouse_id ON production_runs(warehouse_id);
CREATE INDEX idx_production_runs_variant_id ON production_runs(product_variant_id);
CREATE INDEX idx_production_runs_status ON production_runs(status);

CREATE TABLE production_logs (
    id SERIAL PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    details TEXT,
    logged_by_user_id INTEGER NOT NULL REFERENCES users(id),
    logged_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_production_logs_run_id ON production_logs(run_id);

-- ====================
-- SEED DATA
-- ====================

-- Insert default permissions
INSERT INTO permissions (slug, description) VALUES
    ('users.view', 'View users'),
    ('users.create', 'Create users'),
    ('users.update', 'Update users'),
    ('users.delete', 'Delete users'),
    ('roles.view', 'View roles'),
    ('roles.manage', 'Manage roles'),
    ('inventory.view', 'View inventory'),
    ('inventory.adjust', 'Adjust inventory'),
    ('inventory.transfer', 'Transfer inventory'),
    ('products.view', 'View products'),
    ('products.create', 'Create products'),
    ('products.update', 'Update products'),
    ('products.delete', 'Delete products'),
    ('warehouses.view', 'View warehouses'),
    ('warehouses.manage', 'Manage warehouses'),
    ('suppliers.view', 'View suppliers'),
    ('suppliers.manage', 'Manage suppliers'),
    ('procurement.view', 'View procurements'),
    ('procurement.manage', 'Manage procurements'),
    ('production.view', 'View production'),
    ('production.manage', 'Manage production');

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'System administrator with full access'),
    ('manager', 'Can manage inventory, products, and staff'),
    ('staff', 'Can view and perform basic operations');

-- Assign all permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Assign limited permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE slug NOT IN ('roles.manage', 'users.delete');

-- Assign view permissions to staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE slug LIKE '%.view' OR slug IN ('inventory.adjust', 'inventory.transfer');

-- Insert default admin user (password: admin123)
-- The password hash is for 'admin123' using bcrypt
INSERT INTO users (username, password_hash, role_id, is_active) VALUES
    ('admin', '$2a$12$xs3DOahYsWI2swM54sjad.at6NWcc7Dozbx3YEKPkBzLsHi52GGDC', 1, true);

