import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { PermissionGuard } from "@/components/shared/permission-guard";
import LoginPage from "@/pages/login";
import { useAuthStore } from "@/stores/auth-store";

// Import pre-configured lazy pages
import * as Pages from "@/lib/lazy-pages";

/**
 * Smart Landing Logic: 
 * Prevents users from landing on the Dashboard if they don't have permission.
 * This avoids background 403 API calls that trigger the global forbidden redirect.
 */
const LandingRedirect = () => {
    const { hasPermission, getDefaultRoute } = useAuthStore();
    const defaultRoute = getDefaultRoute();

    if (hasPermission("dashboard.view")) {
        return <Pages.DashboardPage />;
    }

    // Safety check: ensure we don't redirect to / infinitely
    if (defaultRoute === "/") return <Pages.DashboardPage />;

    return <Navigate to={defaultRoute} replace />;
};

// Centralized Route Configuration
const routes = [
    // Core Modules
    { path: "/", element: <LandingRedirect /> }, // Use the smart landing here
    { path: "/pos", element: <Pages.POSPage />, perms: ["sales.manage"] },

    // Customers
    { path: "/customers", element: <Pages.CustomersPage />, perms: ["customers.view"] },
    { path: "/customers/import", element: <Pages.CustomerImportPage />, perms: ["customers.manage"] },
    { path: "/customers/:id", element: <Pages.CustomerDetailPage />, perms: ["customers.view"] },

    // Inventory & Products
    { path: "/categories", element: <Pages.CategoriesPage />, perms: ["categories.view"] },
    { path: "/product-families", element: <Pages.ProductFamiliesPage />, perms: ["product_families.view"] },
    { path: "/products", element: <Pages.ProductsPage />, perms: ["products.view"] },
    { path: "/inventory", element: <Pages.InventoryPage />, perms: ["inventory.view"] },
    { path: "/warehouses", element: <Pages.WarehousesPage />, perms: ["warehouses.view"] },

    // Supply Chain
    { path: "/suppliers", element: <Pages.SuppliersPage />, perms: ["suppliers.view"] },
    { path: "/suppliers/:id", element: <Pages.SupplierDetailPage />, perms: ["suppliers.view"] },
    { path: "/procurements", element: <Pages.ProcurementsPage />, perms: ["procurement.view"] },
    { path: "/procurements/new", element: <Pages.CreateProcurementPage />, perms: ["procurement.view"] },
    { path: "/procurements/:id", element: <Pages.ProcurementDetailPage />, perms: ["procurement.view"] },

    // Operations
    { path: "/sales/history", element: <Pages.SalesRecordPage />, perms: ["sales.view"] },
    { path: "/collections", element: <Pages.CollectionPage />, perms: ["collections.manage"] },
    { path: "/deliveries", element: <Pages.DeliveriesPage />, perms: ["subscriptions.view"] },
    { path: "/subscriptions", element: <Pages.SubscriptionsPage />, perms: ["subscriptions.view"] },

    // Financials
    { path: "/expenses", element: <Pages.ExpensesPage />, perms: ["expenses.view"] },
    { path: "/expenses/categories", element: <Pages.ExpenseCategoriesPage />, perms: ["expense_categories.manage"] },

    // Admin & Settings
    { path: "/users", element: <Pages.UsersPage />, perms: ["users.view"] },
    { path: "/roles", element: <Pages.RolesPage />, perms: ["roles.view"] },
    { path: "/serviceability/zones", element: <Pages.ServiceabilityZonesPage />, perms: ["serviceability.view"] },
    { path: "/serviceability/import", element: <Pages.PincodeImportPage />, perms: ["serviceability.manage"] },
    { path: "/serviceability/map", element: <Pages.ServiceabilityMapPage />, perms: ["serviceability.manage"] },
];

function App() {
    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <TooltipProvider>
                <BrowserRouter basename="/">
                    <Routes>
                        {/* Public & Utility Routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/forbidden" element={<Suspense><Pages.ForbiddenPage /></Suspense>} />

                        {/* Protected Application Routes */}
                        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                            {routes.map(({ path, element, perms }) => (
                                <Route
                                    key={path}
                                    path={path}
                                    element={
                                        perms ? <PermissionGuard requireAll={perms}>{element}</PermissionGuard> : element
                                    }
                                />
                            ))}
                        </Route>
                    </Routes>
                </BrowserRouter>
                <Toaster position="top-right" richColors />
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
