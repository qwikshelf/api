import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { Skeleton } from "@/components/ui/skeleton";
import LoginPage from "@/pages/login";

// Lazy-load all page components for code splitting
const DashboardPage = lazy(() => import("@/pages/dashboard"));
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
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
                            <Route path="/categories" element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />
                            <Route path="/warehouses" element={<Suspense fallback={<PageLoader />}><WarehousesPage /></Suspense>} />
                            <Route path="/roles" element={<Suspense fallback={<PageLoader />}><RolesPage /></Suspense>} />
                            <Route path="/users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
                            <Route path="/product-families" element={<Suspense fallback={<PageLoader />}><ProductFamiliesPage /></Suspense>} />
                            <Route path="/products" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
                            <Route path="/suppliers" element={<Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>} />
                            <Route path="/suppliers/:id" element={<Suspense fallback={<PageLoader />}><SupplierDetailPage /></Suspense>} />
                            <Route path="/inventory" element={<Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>} />
                            <Route path="/procurements" element={<Suspense fallback={<PageLoader />}><ProcurementsPage /></Suspense>} />
                            <Route path="/procurements/new" element={<Suspense fallback={<PageLoader />}><CreateProcurementPage /></Suspense>} />
                            <Route path="/procurements/:id" element={<Suspense fallback={<PageLoader />}><ProcurementDetailPage /></Suspense>} />
                            <Route path="/pos" element={<Suspense fallback={<PageLoader />}><POSPage /></Suspense>} />
                            <Route path="/sales/history" element={<Suspense fallback={<PageLoader />}><SalesRecordPage /></Suspense>} />
                            <Route path="/collections" element={<Suspense fallback={<PageLoader />}><CollectionPage /></Suspense>} />
                        </Route>
                    </Routes>
                </BrowserRouter>
                <Toaster position="top-right" richColors />
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
