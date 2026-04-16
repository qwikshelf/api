import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Skeleton } from "@/components/ui/skeleton";
import LoginPage from "@/pages/login";

// Lazy-load all page components for code splitting
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const CustomersPage = lazy(() => import("@/pages/customers"));
const CustomerDetailPage = lazy(() => import("@/pages/customers/detail"));
const CategoriesPage = lazy(() => import("@/pages/categories"));
const WarehousesPage = lazy(() => import("@/pages/warehouses"));
const RolesPage = lazy(() => import("@/pages/roles"));
const UsersPage = lazy(() => import("@/pages/users"));
const ProductFamiliesPage = lazy(() => import("@/pages/product-families"));
const ProductsPage = lazy(() => import("@/pages/products"));
const SuppliersPage = lazy(() => import("@/pages/suppliers"));
const SupplierDetailPage = lazy(() => import("@/pages/suppliers/detail"));
const InventoryPage = lazy(() => import("@/pages/inventory"));
const ProcurementsPage = lazy(() => import("@/pages/procurements"));
const CreateProcurementPage = lazy(() => import("@/pages/procurements/create"));
const ProcurementDetailPage = lazy(() => import("@/pages/procurements/detail"));
const POSPage = lazy(() => import("@/pages/sales/pos-page"));
const CollectionPage = lazy(() => import("@/pages/collections/CollectionPage"));
const SalesRecordPage = lazy(() => import("@/pages/sales/SalesRecordPage"));
const ServiceabilityZonesPage = lazy(() => import("@/pages/serviceability/zones"));
const PincodeImportPage = lazy(() => import("@/pages/serviceability/import"));
const ServiceabilityMapPage = lazy(() => import("@/pages/serviceability/map"));
const DeliveriesPage = lazy(() => import("@/pages/deliveries"));
const SubscriptionsPage = lazy(() => import("@/pages/subscriptions"));
const CustomerImportPage = lazy(() => import("@/pages/customers/import"));
const ExpensesPage = lazy(() => import("@/pages/expenses"));
const ExpenseCategoriesPage = lazy(() => import("@/pages/expenses/categories"));
const ForbiddenPage = lazy(() => import("@/pages/forbidden"));

function PageLoader() {
    return (
        <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
}

function App() {
    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <TooltipProvider>
                <BrowserRouter basename="/">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/forbidden" element={<Suspense fallback={<PageLoader />}><ForbiddenPage /></Suspense>} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
                            <Route path="/pos" element={<Suspense fallback={<PageLoader />}><POSPage /></Suspense>} />
                            <Route path="/customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
                            <Route path="/customers/import" element={<PermissionGuard requireAll={["customers.manage"]}><Suspense fallback={<PageLoader />}><CustomerImportPage /></Suspense></PermissionGuard>} />
                            <Route path="/customers/:id" element={<Suspense fallback={<PageLoader />}><CustomerDetailPage /></Suspense>} />
                            <Route path="/categories" element={<PermissionGuard requireAll={["products.view"]}><Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense></PermissionGuard>} />
                            <Route path="/warehouses" element={<PermissionGuard requireAll={["warehouses.view"]}><Suspense fallback={<PageLoader />}><WarehousesPage /></Suspense></PermissionGuard>} />
                            <Route path="/roles" element={<PermissionGuard requireAll={["roles.view"]}><Suspense fallback={<PageLoader />}><RolesPage /></Suspense></PermissionGuard>} />
                            <Route path="/users" element={<PermissionGuard requireAll={["users.view"]}><Suspense fallback={<PageLoader />}><UsersPage /></Suspense></PermissionGuard>} />
                            <Route path="/product-families" element={<PermissionGuard requireAll={["products.view"]}><Suspense fallback={<PageLoader />}><ProductFamiliesPage /></Suspense></PermissionGuard>} />
                            <Route path="/products" element={<PermissionGuard requireAll={["products.view"]}><Suspense fallback={<PageLoader />}><ProductsPage /></Suspense></PermissionGuard>} />
                            <Route path="/suppliers" element={<PermissionGuard requireAll={["suppliers.view"]}><Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense></PermissionGuard>} />
                            <Route path="/suppliers/:id" element={<PermissionGuard requireAll={["suppliers.view"]}><Suspense fallback={<PageLoader />}><SupplierDetailPage /></Suspense></PermissionGuard>} />
                            <Route path="/inventory" element={<PermissionGuard requireAll={["inventory.view"]}><Suspense fallback={<PageLoader />}><InventoryPage /></Suspense></PermissionGuard>} />
                            <Route path="/expenses" element={<PermissionGuard requireAll={["expenses.view"]}><Suspense fallback={<PageLoader />}><ExpensesPage /></Suspense></PermissionGuard>} />
                            <Route path="/expenses/categories" element={<PermissionGuard requireAll={["expense_categories.manage"]}><Suspense fallback={<PageLoader />}><ExpenseCategoriesPage /></Suspense></PermissionGuard>} />
                            <Route path="/procurements" element={<PermissionGuard requireAll={["procurement.view"]}><Suspense fallback={<PageLoader />}><ProcurementsPage /></Suspense></PermissionGuard>} />
                            <Route path="/procurements/new" element={<PermissionGuard requireAll={["procurement.view"]}><Suspense fallback={<PageLoader />}><CreateProcurementPage /></Suspense></PermissionGuard>} />
                            <Route path="/procurements/:id" element={<PermissionGuard requireAll={["procurement.view"]}><Suspense fallback={<PageLoader />}><ProcurementDetailPage /></Suspense></PermissionGuard>} />
                            <Route path="/sales/history" element={<PermissionGuard requireAll={["sales.view"]}><Suspense fallback={<PageLoader />}><SalesRecordPage /></Suspense></PermissionGuard>} />
                            <Route path="/collections" element={<PermissionGuard requireAll={["procurement.manage"]}><Suspense fallback={<PageLoader />}><CollectionPage /></Suspense></PermissionGuard>} />
                            <Route path="/serviceability/zones" element={<PermissionGuard requireAll={["serviceability.manage"]}><Suspense fallback={<PageLoader />}><ServiceabilityZonesPage /></Suspense></PermissionGuard>} />
                            <Route path="/serviceability/import" element={<PermissionGuard requireAll={["serviceability.manage"]}><Suspense fallback={<PageLoader />}><PincodeImportPage /></Suspense></PermissionGuard>} />
                            <Route path="/serviceability/map" element={<PermissionGuard requireAll={["serviceability.manage"]}><Suspense fallback={<PageLoader />}><ServiceabilityMapPage /></Suspense></PermissionGuard>} />
                            <Route path="/deliveries" element={<PermissionGuard requireAll={["subscriptions.view"]}><Suspense fallback={<PageLoader />}><DeliveriesPage /></Suspense></PermissionGuard>} />
                            <Route path="/subscriptions" element={<PermissionGuard requireAll={["subscriptions.view"]}><Suspense fallback={<PageLoader />}><SubscriptionsPage /></Suspense></PermissionGuard>} />
                        </Route>
                    </Routes>
                </BrowserRouter>
                <Toaster position="top-right" richColors />
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
