import { lazy, type ComponentType } from "react";

/**
 * Enhanced lazy loader with preloading capability
 * Wraps the standard React.lazy to allow background fetching
 */
function lazyWithPreload<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
) {
    const Component = lazy(factory);
    (Component as any).preload = factory;
    return Component as any as T & { preload: () => Promise<{ default: T }> };
}

// Lazy-load page components with strategic chunk grouping
export const DashboardPage = lazyWithPreload(() => import(/* webpackChunkName: "dashboard" */ "@/pages/dashboard"));
export const ForbiddenPage = lazyWithPreload(() => import(/* webpackChunkName: "utility" */ "@/pages/forbidden"));

// Customer Module Group
export const CustomersPage = lazyWithPreload(() => import(/* webpackChunkName: "customers" */ "@/pages/customers"));
export const CustomerDetailPage = lazyWithPreload(() => import(/* webpackChunkName: "customers" */ "@/pages/customers/detail"));
export const CustomerImportPage = lazyWithPreload(() => import(/* webpackChunkName: "customers" */ "@/pages/customers/import"));

// Catalog & Inventory Group
export const CategoriesPage = lazyWithPreload(() => import(/* webpackChunkName: "inventory" */ "@/pages/categories"));
export const ProductFamiliesPage = lazyWithPreload(() => import(/* webpackChunkName: "inventory" */ "@/pages/product-families"));
export const ProductsPage = lazyWithPreload(() => import(/* webpackChunkName: "inventory" */ "@/pages/products"));
export const InventoryPage = lazyWithPreload(() => import(/* webpackChunkName: "inventory" */ "@/pages/inventory"));
export const WarehousesPage = lazyWithPreload(() => import(/* webpackChunkName: "inventory" */ "@/pages/warehouses"));

// Supply Chain Group
export const SuppliersPage = lazyWithPreload(() => import(/* webpackChunkName: "procurement" */ "@/pages/suppliers"));
export const SupplierDetailPage = lazyWithPreload(() => import(/* webpackChunkName: "procurement" */ "@/pages/suppliers/detail"));
export const ProcurementsPage = lazyWithPreload(() => import(/* webpackChunkName: "procurement" */ "@/pages/procurements"));
export const CreateProcurementPage = lazyWithPreload(() => import(/* webpackChunkName: "procurement" */ "@/pages/procurements/create"));
export const ProcurementDetailPage = lazyWithPreload(() => import(/* webpackChunkName: "procurement" */ "@/pages/procurements/detail"));

// Sales & Operations Group
export const POSPage = lazyWithPreload(() => import(/* webpackChunkName: "sales" */ "@/pages/sales/pos-page"));
export const SalesRecordPage = lazyWithPreload(() => import(/* webpackChunkName: "sales" */ "@/pages/sales/SalesRecordPage"));
export const CollectionPage = lazyWithPreload(() => import(/* webpackChunkName: "sales" */ "@/pages/collections/CollectionPage"));
export const DeliveriesPage = lazyWithPreload(() => import(/* webpackChunkName: "delivery" */ "@/pages/deliveries"));
export const SubscriptionsPage = lazyWithPreload(() => import(/* webpackChunkName: "delivery" */ "@/pages/subscriptions"));
export const SubscriptionInvoicesPage = lazyWithPreload(() => import(/* webpackChunkName: "delivery" */ "@/pages/subscriptions/invoices"));
export const InvoiceDetailPage = lazyWithPreload(() => import(/* webpackChunkName: "delivery" */ "@/pages/subscriptions/invoices/detail"));

// Financials Group
export const ExpensesPage = lazyWithPreload(() => import(/* webpackChunkName: "financials" */ "@/pages/expenses"));
export const ExpenseCategoriesPage = lazyWithPreload(() => import(/* webpackChunkName: "financials" */ "@/pages/expenses/categories"));

// Admin & Serviceability Group
export const RolesPage = lazyWithPreload(() => import(/* webpackChunkName: "admin" */ "@/pages/roles"));
export const UsersPage = lazyWithPreload(() => import(/* webpackChunkName: "admin" */ "@/pages/users"));
export const ServiceabilityZonesPage = lazyWithPreload(() => import(/* webpackChunkName: "admin" */ "@/pages/serviceability/zones"));
export const PincodeImportPage = lazyWithPreload(() => import(/* webpackChunkName: "admin" */ "@/pages/serviceability/import"));
export const ServiceabilityMapPage = lazyWithPreload(() => import(/* webpackChunkName: "admin" */ "@/pages/serviceability/map"));
