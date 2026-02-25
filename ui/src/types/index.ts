// ============================================================
// TypeScript interfaces matching the Go API DTOs
// ============================================================

// --- Auth ---
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    user: UserResponse;
}

// --- Users ---
export interface CreateUserRequest {
    username: string;
    password: string;
    role_id: number;
    is_active: boolean;
    direct_permission_ids?: number[];
}

export interface UpdateUserRequest {
    username?: string;
    password?: string;
    role_id?: number;
    is_active?: boolean;
    direct_permission_ids?: number[];
}

export interface UserResponse {
    id: number;
    username: string;
    role_id: number;
    role?: RoleResponse;
    is_active: boolean;
    created_at: string;
    permissions?: PermissionResponse[];
}

// --- Roles ---
export interface CreateRoleRequest {
    name: string;
    description?: string;
    permission_ids?: number[];
}

export interface UpdateRoleRequest {
    name?: string;
    description?: string;
    permission_ids?: number[];
}

export interface RoleResponse {
    id: number;
    name: string;
    description?: string;
    permissions?: PermissionResponse[];
}

export interface PermissionResponse {
    id: number;
    slug: string;
    description?: string;
}

// --- Categories ---
export interface CategoryResponse {
    id: number;
    name: string;
}

// --- Product Families ---
export interface ProductFamilyResponse {
    id: number;
    category_id: number;
    name: string;
    description?: string;
    category?: CategoryResponse;
}

// --- Product Variants ---
export interface ProductVariantResponse {
    id: number;
    family_id: number;
    family_name?: string;
    name: string;
    sku: string;
    barcode?: string;
    unit: string;
    cost_price: string;
    selling_price: string;
    is_manufactured: boolean;
    conversion_factor: string;
}

export interface CreateProductVariantRequest {
    family_id: number;
    name: string;
    sku: string;
    barcode?: string;
    unit: string;
    cost_price: string;
    selling_price: string;
    is_manufactured: boolean;
    conversion_factor?: string;
}

export interface UpdateProductVariantRequest {
    family_id?: number;
    name?: string;
    sku?: string;
    barcode?: string;
    unit?: string;
    cost_price?: string;
    selling_price?: string;
    is_manufactured?: boolean;
    conversion_factor?: string;
}

// --- Warehouses ---
export type WarehouseType = "store" | "factory" | "distribution_center";

export interface WarehouseResponse {
    id: number;
    name: string;
    type: WarehouseType;
    address?: string;
}

// --- Suppliers ---
export interface SupplierResponse {
    id: number;
    name: string;
    phone?: string;
    location?: string;
}

export interface SupplierVariantResponse {
    supplier_id: number;
    supplier?: SupplierResponse;
    variant_id: number;
    variant?: ProductVariantResponse;
    agreed_cost: string;
    is_preferred: boolean;
}

// --- Inventory ---
export interface InventoryLevelResponse {
    id: number;
    warehouse_id: number;
    warehouse?: WarehouseResponse;
    variant_id: number;
    variant?: ProductVariantResponse;
    quantity: string;
    batch_number?: number;
    expiry_date?: string;
}

export interface AdjustInventoryRequest {
    warehouse_id: number;
    variant_id: number;
    quantity_delta: string;
    reason?: string;
}

export interface CreateTransferRequest {
    source_warehouse_id: number;
    destination_warehouse_id: number;
    items: { variant_id: number; quantity: string }[];
}

// --- Procurements ---
export interface ProcurementResponse {
    id: number;
    supplier_id: number;
    supplier_name?: string;
    warehouse_id: number;
    warehouse_name?: string;
    ordered_by_user_id: number;
    created_at: string;
    expected_delivery?: string;
    status: string;
    total_cost: string;
    items?: ProcurementItemResponse[];
}

export interface ProcurementItemResponse {
    id: number;
    variant_id: number;
    variant_name?: string;
    variant_sku?: string;
    variant_unit?: string;
    quantity_ordered: string;
    quantity_received: string;
    unit_cost: string;
    line_total: string;
}

export interface CreateProcurementRequest {
    supplier_id: number;
    warehouse_id: number;
    expected_delivery?: string;
    items: { variant_id: number; quantity: string; unit_cost: string }[];
}

// --- Collections ---
export interface CollectionResponse {
    id: number;
    variant_id: number;
    variant_name?: string;
    supplier_id: number;
    supplier_name?: string;
    agent_id: number;
    agent_name?: string;
    warehouse_id: number;
    weight: string;
    collected_at: string;
    notes?: string;
}

// --- Sales ---
export interface SaleResponse {
    id: number;
    warehouse_id: number;
    warehouse_name?: string;
    customer_name: string;
    total_amount: string;
    tax_amount: string;
    discount_amount: string;
    payment_method: string;
    processed_by_user_id: number;
    processed_by_name?: string;
    created_at: string;
    items?: SaleItemResponse[];
}

export interface SaleItemResponse {
    id: number;
    variant_id: number;
    variant_name?: string;
    variant_sku?: string;
    quantity: string;
    unit_price: string;
    line_total: string;
}

// --- Generic API Response ---
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    meta?: PaginationMeta;
    error?: { code: string; message: string };
}

export interface PaginationMeta {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
}
