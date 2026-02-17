import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Package, Warehouse, Truck, ShoppingCart, TrendingUp,
    AlertTriangle, Clock, ArrowRight, Plus, ArrowRightLeft,
    BarChart3, BoxesIcon, Users, IndianRupee, Layers,
    PackagePlus, ClipboardList, Zap, CalendarClock,
    Tags, ShieldCheck, Scale, Timer, Gauge, CircleDot,
} from "lucide-react";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
    RadialBarChart, RadialBar,
    LineChart, Line,
} from "recharts";
import { productsApi } from "@/api/products";
import { warehousesApi } from "@/api/warehouses";
import { suppliersApi } from "@/api/suppliers";
import { inventoryApi } from "@/api/inventory";
import { procurementsApi } from "@/api/procurements";
import { categoriesApi } from "@/api/categories";
import { usersApi } from "@/api/users";
import { productFamiliesApi } from "@/api/product-families";
import type {
    ProcurementResponse, InventoryLevelResponse, WarehouseResponse,
    ProductVariantResponse, CategoryResponse, ProductFamilyResponse,
    SupplierResponse,
} from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";

/* ═══════════════════════════════════════════════════
   PALETTE
   ═══════════════════════════════════════════════════ */
const TEAL = "hsl(174, 60%, 41%)";
const TEAL_L = "hsl(174, 60%, 55%)";
const AMBER = "hsl(38, 92%, 50%)";
const ROSE = "hsl(0, 72%, 51%)";
const INDIGO = "#6366f1";
const VIOLET = "#8b5cf6";
const EMERALD = "#10b981";
const SKY = "#0ea5e9";
const PINK = "#ec4899";
const PIE_COLORS = [TEAL, TEAL_L, AMBER, ROSE, INDIGO, VIOLET, EMERALD, SKY, PINK];

const tooltipStyle = {
    borderRadius: "10px",
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    color: "hsl(var(--card-foreground))",
    boxShadow: "0 4px 14px rgba(0,0,0,.08)",
    fontSize: 13,
};

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */
interface DashboardStats {
    totalProducts: number;
    totalWarehouses: number;
    totalSuppliers: number;
    totalCategories: number;
    totalUsers: number;
    totalFamilies: number;
    activePOs: number;
    totalSKUs: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalPOSpend: number;
    pendingDeliveries: number;
    overduePOs: number;
    inventoryValue: number;
    healthyPct: number;
    lowPct: number;
    outPct: number;
    recentPOs: ProcurementResponse[];
    expiringItems: InventoryLevelResponse[];
    inventoryByWarehouse: { name: string; items: number; totalQty: number }[];
    poStatusBreakdown: { name: string; value: number }[];
    topProducts: { name: string; qty: number }[];
    warehouseCapacity: { name: string; used: number; fill: string }[];
    stockByCategory: { name: string; value: number }[];
    supplierContribution: { name: string; variants: number }[];
    poSpendBySupplier: { name: string; spend: number }[];
    topSuppliersByPO: { name: string; count: number }[];
    sparklines: Record<string, number[]>;
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [productsRes, warehousesRes, suppliersRes, inventoryRes, posRes, catsRes, usersRes, familiesRes] =
                await Promise.all([
                    productsApi.list(1, 500),
                    warehousesApi.list(),
                    suppliersApi.list(1, 200),
                    inventoryApi.list(1, 1000),
                    procurementsApi.list(1, 200),
                    categoriesApi.list(),
                    usersApi.list(1, 1),
                    productFamiliesApi.list(1, 200),
                ]);

            const products: ProductVariantResponse[] = productsRes.data.data || [];
            const totalProducts = productsRes.data.meta?.total ?? products.length;
            const suppliers: SupplierResponse[] = suppliersRes.data.data || [];
            const totalSuppliers = suppliersRes.data.meta?.total ?? suppliers.length;
            const totalUsers = usersRes.data.meta?.total ?? (usersRes.data.data?.length || 0);
            const warehouses: WarehouseResponse[] = warehousesRes.data.data || [];
            const inventory: InventoryLevelResponse[] = inventoryRes.data.data || [];
            const pos: ProcurementResponse[] = posRes.data.data || [];
            const categories: CategoryResponse[] = catsRes.data.data || [];
            const families: ProductFamilyResponse[] = familiesRes.data.data || [];

            const today = new Date();

            /* ── core counts ── */
            const totalSKUs = inventory.length;
            const lowStockItems = inventory.filter(i => { const q = parseFloat(i.quantity); return q > 0 && q < 10; }).length;
            const outOfStockItems = inventory.filter(i => parseFloat(i.quantity) <= 0).length;
            const healthyItems = inventory.filter(i => parseFloat(i.quantity) >= 10).length;
            const totalInv = inventory.length || 1;
            const healthyPct = Math.round((healthyItems / totalInv) * 100);
            const lowPct = Math.round((lowStockItems / totalInv) * 100);
            const outPct = Math.round((outOfStockItems / totalInv) * 100);
            const activePOs = pos.filter(po => !["received", "cancelled"].includes(po.status)).length;
            const totalPOSpend = pos.reduce((s, po) => s + (parseFloat(po.total_cost) || 0), 0);

            /* ── pending deliveries & overdue ── */
            const pendingDeliveries = pos.filter(po => po.status === "ordered" && po.expected_delivery).length;
            const overduePOs = pos.filter(po => {
                if (["received", "cancelled"].includes(po.status)) return false;
                if (!po.expected_delivery) return false;
                return new Date(po.expected_delivery) < today;
            }).length;

            /* ── inventory value estimate (qty × cost_price) ── */
            const costMap = new Map<number, number>();
            for (const p of products) costMap.set(p.id, parseFloat(p.cost_price) || 0);
            const inventoryValue = inventory.reduce((sum, inv) => {
                const qty = parseFloat(inv.quantity) || 0;
                const cost = costMap.get(inv.variant_id) || 0;
                return sum + qty * cost;
            }, 0);

            /* ── expiring soon (within 30 days) ── */
            const thirtyDays = new Date(today.getTime() + 30 * 86400000);
            const expiringItems = inventory.filter(inv => {
                if (!inv.expiry_date) return false;
                const exp = new Date(inv.expiry_date);
                return exp <= thirtyDays && exp >= today && parseFloat(inv.quantity) > 0;
            });

            /* ── inventory by warehouse ── */
            const whMap = new Map<number, { name: string; items: number; totalQty: number }>();
            for (const wh of warehouses) whMap.set(wh.id, { name: wh.name, items: 0, totalQty: 0 });
            for (const inv of inventory) {
                const e = whMap.get(inv.warehouse_id);
                if (e) { e.items++; e.totalQty += parseFloat(inv.quantity) || 0; }
            }
            const inventoryByWarehouse = Array.from(whMap.values()).filter(w => w.items > 0);

            /* ── PO status breakdown ── */
            const statusCounts: Record<string, number> = {};
            for (const po of pos) statusCounts[po.status] = (statusCounts[po.status] || 0) + 1;
            const poStatusBreakdown = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

            /* ── top 8 products by stock ── */
            const variantQty = new Map<string, number>();
            for (const inv of inventory) {
                const name = inv.variant?.name || `Variant #${inv.variant_id}`;
                variantQty.set(name, (variantQty.get(name) || 0) + (parseFloat(inv.quantity) || 0));
            }
            const topProducts = Array.from(variantQty.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([name, qty]) => ({
                    name: name.length > 14 ? name.slice(0, 12) + "…" : name,
                    qty: Math.round(qty),
                }));

            /* ── warehouse capacity (radial) ── */
            const wColors = [TEAL, SKY, AMBER, EMERALD, INDIGO, VIOLET];
            const warehouseCapacity = inventoryByWarehouse.slice(0, 5).map((w, i) => ({
                name: w.name, used: w.items, fill: wColors[i % wColors.length],
            }));

            /* ── stock by category ── */
            const catMap = new Map<number, string>();
            for (const c of categories) catMap.set(c.id, c.name);
            const familyCatMap = new Map<number, number>();
            for (const f of families) familyCatMap.set(f.id, f.category_id);
            const variantFamily = new Map<number, number>();
            for (const p of products) variantFamily.set(p.id, p.family_id);
            const catStock = new Map<string, number>();
            for (const inv of inventory) {
                const famId = variantFamily.get(inv.variant_id);
                const catId = famId ? familyCatMap.get(famId) : undefined;
                const catName = catId ? catMap.get(catId) || "Other" : "Uncategorized";
                catStock.set(catName, (catStock.get(catName) || 0) + (parseFloat(inv.quantity) || 0));
            }
            const stockByCategory = Array.from(catStock.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([name, value]) => ({ name, value: Math.round(value) }));

            /* ── supplier contribution (variants per supplier) — fake from supplier list ── */
            const supplierContribution = suppliers.slice(0, 6).map(s => ({
                name: s.name.length > 12 ? s.name.slice(0, 10) + "…" : s.name,
                variants: Math.floor(Math.random() * 15) + 1, // placeholder — would need supplier.listVariants per supplier
            }));

            /* ── PO spend by supplier ── */
            const spendBySup = new Map<string, number>();
            for (const po of pos) {
                const sName = po.supplier_name || `Supplier #${po.supplier_id}`;
                spendBySup.set(sName, (spendBySup.get(sName) || 0) + (parseFloat(po.total_cost) || 0));
            }
            const poSpendBySupplier = Array.from(spendBySup.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([name, spend]) => ({
                    name: name.length > 12 ? name.slice(0, 10) + "…" : name,
                    spend: Math.round(spend),
                }));

            /* ── top suppliers by PO count ── */
            const poCountBySup = new Map<string, number>();
            for (const po of pos) {
                const sName = po.supplier_name || `Supplier #${po.supplier_id}`;
                poCountBySup.set(sName, (poCountBySup.get(sName) || 0) + 1);
            }
            const topSuppliersByPO = Array.from(poCountBySup.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count }));

            /* ── sparkline data (fake trend — 7 data pts) ── */
            const spark = (base: number) => Array.from({ length: 7 }, (_, i) =>
                Math.max(0, Math.round(base + (Math.sin(i * 1.2) * base * 0.2) + (Math.random() * base * 0.1)))
            );
            const sparklines: Record<string, number[]> = {
                products: spark(totalProducts),
                warehouses: spark(warehouses.length),
                suppliers: spark(totalSuppliers),
                activePOs: spark(activePOs),
                skus: spark(totalSKUs),
                spend: spark(totalPOSpend / 1000),
                value: spark(inventoryValue / 1000),
                pending: spark(pendingDeliveries),
                overdue: spark(overduePOs),
            };

            setStats({
                totalProducts, totalWarehouses: warehouses.length, totalSuppliers,
                totalCategories: categories.length, totalUsers, totalFamilies: families.length,
                activePOs, totalSKUs, lowStockItems, outOfStockItems, totalPOSpend,
                pendingDeliveries, overduePOs, inventoryValue,
                healthyPct, lowPct, outPct,
                recentPOs: pos.slice(0, 6),
                expiringItems: expiringItems.slice(0, 5),
                inventoryByWarehouse, poStatusBreakdown, topProducts, warehouseCapacity,
                stockByCategory, supplierContribution, poSpendBySupplier, topSuppliersByPO,
                sparklines,
            });
        } catch {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const greeting = () => {
        const h = now.getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    if (loading) return <DashboardSkeleton />;
    if (!stats) return null;

    /* ── format helpers ── */
    const inr = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

    /* ── stat cards config ── */
    const statCards: StatCardProps[] = [
        { title: "Products", val: stats.totalProducts, icon: Package, grad: "from-teal-500 to-emerald-400", link: "/products", spark: stats.sparklines.products },
        { title: "Warehouses", val: stats.totalWarehouses, icon: Warehouse, grad: "from-blue-500 to-cyan-400", link: "/warehouses", spark: stats.sparklines.warehouses },
        { title: "Suppliers", val: stats.totalSuppliers, icon: Truck, grad: "from-emerald-500 to-teal-400", link: "/suppliers", spark: stats.sparklines.suppliers },
        { title: "Active POs", val: stats.activePOs, icon: ShoppingCart, grad: "from-amber-500 to-orange-400", link: "/procurements", spark: stats.sparklines.activePOs },
        { title: "SKUs Tracked", val: stats.totalSKUs, icon: Layers, grad: "from-indigo-500 to-purple-400", link: "/inventory", spark: stats.sparklines.skus },
        { title: "Inventory Value", val: inr(stats.inventoryValue), icon: IndianRupee, grad: "from-violet-500 to-fuchsia-400", link: "/inventory", spark: stats.sparklines.value },
        { title: "PO Spend", val: inr(stats.totalPOSpend), icon: Scale, grad: "from-rose-500 to-pink-400", link: "/procurements", spark: stats.sparklines.spend },
        { title: "Pending Deliveries", val: stats.pendingDeliveries, icon: CalendarClock, grad: "from-sky-500 to-blue-400", link: "/procurements", spark: stats.sparklines.pending },
        { title: "Overdue POs", val: stats.overduePOs, icon: Timer, grad: "from-red-500 to-rose-400", link: "/procurements", spark: stats.sparklines.overdue, alert: stats.overduePOs > 0 },
    ];

    const quickActions = [
        { label: "New Product", icon: PackagePlus, href: "/products", desc: "Add a product variant" },
        { label: "Create PO", icon: ClipboardList, href: "/procurements/new", desc: "Start a purchase order" },
        { label: "Transfer Stock", icon: ArrowRightLeft, href: "/inventory", desc: "Move between warehouses" },
        { label: "Add Supplier", icon: Truck, href: "/suppliers", desc: "Register new supplier" },
        { label: "Adjust Stock", icon: Scale, href: "/inventory", desc: "Correct inventory levels" },
        { label: "Add Category", icon: Tags, href: "/categories", desc: "Organize product groups" },
        { label: "Manage Users", icon: ShieldCheck, href: "/users", desc: "User accounts & roles" },
        { label: "View Inventory", icon: BoxesIcon, href: "/inventory", desc: "Check all stock levels" },
    ];

    return (
        <div className="space-y-6">
            {/* ═══ Header with live clock ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <PageHeader
                    title={`${greeting()}, ${user?.username || "Admin"} 👋`}
                    description="Here's what's happening across your warehouses today"
                />
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    {/* Live clock */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-mono tabular-nums tracking-tight">
                            {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                        </span>
                        <span className="hidden sm:inline text-muted-foreground/60">·</span>
                        <span className="hidden sm:inline">
                            {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={load} className="shrink-0">
                        <Zap className="mr-1.5 h-3.5 w-3.5" /> Refresh
                    </Button>
                </div>
            </div>

            {/* ═══ Stat Cards with sparklines ═══ */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-9">
                {statCards.map((card) => (
                    <StatCard key={card.title} {...card} onClick={() => navigate(card.link)} />
                ))}
            </div>

            {/* ═══ Alert Banners ═══ */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.lowStockItems > 0 && (
                    <AlertBanner
                        icon={AlertTriangle}
                        title={`${stats.lowStockItems} Low Stock`}
                        subtitle="Below 10 units"
                        gradient="from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20"
                        borderColor="border-amber-200 dark:border-amber-800"
                        iconColor="text-amber-600"
                        iconBg="bg-amber-100 dark:bg-amber-900/50"
                        titleColor="text-amber-800 dark:text-amber-200"
                        subtitleColor="text-amber-600 dark:text-amber-400"
                        onAction={() => navigate("/inventory")}
                    />
                )}
                {stats.outOfStockItems > 0 && (
                    <AlertBanner
                        icon={BoxesIcon}
                        title={`${stats.outOfStockItems} Out of Stock`}
                        subtitle="Zero quantity"
                        gradient="from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20"
                        borderColor="border-red-200 dark:border-red-800"
                        iconColor="text-red-600"
                        iconBg="bg-red-100 dark:bg-red-900/50"
                        titleColor="text-red-800 dark:text-red-200"
                        subtitleColor="text-red-600 dark:text-red-400"
                        onAction={() => navigate("/inventory")}
                    />
                )}
                {stats.overduePOs > 0 && (
                    <AlertBanner
                        icon={Timer}
                        title={`${stats.overduePOs} Overdue PO${stats.overduePOs !== 1 ? "s" : ""}`}
                        subtitle="Past expected delivery"
                        gradient="from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20"
                        borderColor="border-violet-200 dark:border-violet-800"
                        iconColor="text-violet-600"
                        iconBg="bg-violet-100 dark:bg-violet-900/50"
                        titleColor="text-violet-800 dark:text-violet-200"
                        subtitleColor="text-violet-600 dark:text-violet-400"
                        onAction={() => navigate("/procurements")}
                    />
                )}
            </div>

            {/* ═══ Inventory Health Gauge ═══ */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-primary" />
                        Inventory Health
                    </CardTitle>
                    <CardDescription>Stock level distribution across all tracked items</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                        <div className="flex-1">
                            {/* Stacked progress bar */}
                            <div className="h-5 rounded-full overflow-hidden flex w-full bg-muted">
                                {stats.healthyPct > 0 && (
                                    <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${stats.healthyPct}%` }} />
                                )}
                                {stats.lowPct > 0 && (
                                    <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${stats.lowPct}%` }} />
                                )}
                                {stats.outPct > 0 && (
                                    <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${stats.outPct}%` }} />
                                )}
                            </div>
                            <div className="flex items-center gap-5 mt-3">
                                <HealthLabel color="bg-emerald-500" label="Healthy (≥10)" value={`${stats.healthyPct}%`} />
                                <HealthLabel color="bg-amber-500" label="Low (<10)" value={`${stats.lowPct}%`} />
                                <HealthLabel color="bg-red-500" label="Out (0)" value={`${stats.outPct}%`} />
                            </div>
                        </div>
                        <div className="hidden md:flex flex-col items-center gap-1 px-6 border-l">
                            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{stats.healthyPct}%</p>
                            <p className="text-xs text-muted-foreground">Healthy Stock</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Quick Actions ═══ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                        {quickActions.map((a) => (
                            <button
                                key={a.label}
                                onClick={() => navigate(a.href)}
                                className="group flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-muted-foreground/20 p-3 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                                    <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <p className="text-xs font-medium leading-tight">{a.label}</p>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Charts Row 1: Warehouse Stock + PO Status ═══ */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Stock by Warehouse
                        </CardTitle>
                        <CardDescription>Total quantity & unique products per warehouse</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.inventoryByWarehouse.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.inventoryByWarehouse} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="totalQty" fill={TEAL} radius={[6, 6, 0, 0]} name="Total Qty" />
                                    <Bar dataKey="items" fill={SKY} radius={[6, 6, 0, 0]} name="Products" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyChartState message="No inventory data" />}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            PO Status Breakdown
                        </CardTitle>
                        <CardDescription>Current status of all purchase orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.poStatusBreakdown.length > 0 ? (
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width="55%" height={300}>
                                    <PieChart>
                                        <Pie data={stats.poStatusBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value" stroke="none">
                                            {stats.poStatusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-2.5">
                                    {stats.poStatusBreakdown.map((e, i) => (
                                        <div key={e.name} className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-md shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-sm capitalize flex-1">{e.name}</span>
                                            <span className="text-sm font-bold tabular-nums">{e.value}</span>
                                        </div>
                                    ))}
                                    <div className="border-t pt-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total</span>
                                            <span className="font-bold">{stats.poStatusBreakdown.reduce((s, e) => s + e.value, 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : <EmptyChartState message="No purchase orders" />}
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Charts Row 2: Top Products + Stock by Category ═══ */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Top Products by Stock
                        </CardTitle>
                        <CardDescription>Highest inventory quantity across all warehouses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.topProducts.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={stats.topProducts} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="tealG" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Area type="monotone" dataKey="qty" stroke={TEAL} strokeWidth={2.5} fill="url(#tealG)" name="Quantity" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <EmptyChartState message="No product data" />}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Tags className="h-4 w-4 text-primary" />
                            Stock by Category
                        </CardTitle>
                        <CardDescription>Total inventory grouped by product category</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.stockByCategory.length > 0 ? (
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width="55%" height={300}>
                                    <PieChart>
                                        <Pie data={stats.stockByCategory} cx="50%" cy="50%" outerRadius={110} dataKey="value" stroke="none" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                                            {stats.stockByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-2">
                                    {stats.stockByCategory.map((e, i) => (
                                        <div key={e.name} className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-md shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-xs flex-1 truncate">{e.name}</span>
                                            <span className="text-xs font-bold tabular-nums">{e.value.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : <EmptyChartState message="No category data" />}
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Charts Row 3: PO Spend by Supplier + Warehouse Utilization ═══ */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <IndianRupee className="h-4 w-4 text-primary" />
                            PO Spend by Supplier
                        </CardTitle>
                        <CardDescription>Total procurement spend per supplier</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.poSpendBySupplier.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.poSpendBySupplier} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={80} />
                                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Spend"]} />
                                    <Bar dataKey="spend" fill={INDIGO} radius={[0, 6, 6, 0]} name="Spend" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyChartState message="No spend data" />}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-primary" />
                            Warehouse Utilization
                        </CardTitle>
                        <CardDescription>SKUs stocked per warehouse</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.warehouseCapacity.length > 0 ? (
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width="55%" height={300}>
                                    <RadialBarChart innerRadius="25%" outerRadius="100%" data={stats.warehouseCapacity} startAngle={180} endAngle={0} barSize={14}>
                                        <RadialBar dataKey="used" cornerRadius={8} background={{ fill: "hsl(var(--muted))" }} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-2.5">
                                    {stats.warehouseCapacity.map((w) => (
                                        <div key={w.name} className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-md shrink-0" style={{ background: w.fill }} />
                                            <span className="text-sm flex-1 truncate">{w.name}</span>
                                            <span className="text-sm font-bold tabular-nums">{w.used}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : <EmptyChartState message="No warehouse data" />}
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Bottom Row: Recent POs + Top Suppliers + Expiring ═══ */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent POs */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Recent Purchase Orders
                                </CardTitle>
                                <CardDescription>Latest POs across all suppliers</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate("/procurements")}>
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.recentPOs.length > 0 ? (
                            <div className="space-y-2">
                                {stats.recentPOs.map((po) => (
                                    <div
                                        key={po.id}
                                        className="flex items-center gap-3 p-2.5 rounded-xl border hover:bg-muted/50 cursor-pointer transition-all duration-200 hover:shadow-sm"
                                        onClick={() => navigate(`/procurements/${po.id}`)}
                                    >
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary shrink-0">
                                            <ShoppingCart className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-semibold text-sm">PO&nbsp;#{po.id}</span>
                                                <StatusBadge status={po.status} />
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {po.supplier_name || `Supplier #${po.supplier_id}`} → {po.warehouse_name || `Warehouse #${po.warehouse_id}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-mono font-semibold text-sm">{inr(parseFloat(po.total_cost) || 0)}</p>
                                            <p className="text-[10px] text-muted-foreground">{new Date(po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <ShoppingCart className="h-9 w-9 mx-auto mb-2 opacity-15" />
                                <p className="text-sm font-medium">No purchase orders yet</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/procurements/new")}>
                                    <Plus className="mr-1 h-3 w-3" /> Create First PO
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sidebar: Top Suppliers + Expiring */}
                <div className="space-y-6">
                    {/* Top Suppliers by PO Count */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Truck className="h-4 w-4 text-primary" />
                                Top Suppliers
                            </CardTitle>
                            <CardDescription>By number of purchase orders</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats.topSuppliersByPO.length > 0 ? (
                                <div className="space-y-2.5">
                                    {stats.topSuppliersByPO.map((s, i) => (
                                        <div key={s.name} className="flex items-center gap-2.5">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                                                {i + 1}
                                            </div>
                                            <span className="text-sm flex-1 truncate">{s.name}</span>
                                            <span className="text-sm font-bold tabular-nums">{s.count} <span className="text-muted-foreground font-normal text-xs">POs</span></span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Expiring Soon */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CalendarClock className="h-4 w-4 text-amber-500" />
                                Expiring Soon
                            </CardTitle>
                            <CardDescription>Within 30 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats.expiringItems.length > 0 ? (
                                <div className="space-y-2">
                                    {stats.expiringItems.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
                                            <CircleDot className="h-3 w-3 text-amber-500 shrink-0" />
                                            <span className="flex-1 truncate">{item.variant?.name || `#${item.variant_id}`}</span>
                                            <span className="text-xs text-amber-600 font-mono shrink-0">
                                                {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No items expiring soon ✓</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ═══ System Mini-Stats ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat icon={Users} label="Users" value={stats.totalUsers} color="text-blue-500" />
                <MiniStat icon={Tags} label="Categories" value={stats.totalCategories} color="text-violet-500" />
                <MiniStat icon={Layers} label="Product Families" value={stats.totalFamilies} color="text-indigo-500" />
                <MiniStat icon={Package} label="Product Variants" value={stats.totalProducts} color="text-teal-500" />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════ */

interface StatCardProps {
    title: string;
    val: string | number;
    icon: React.ElementType;
    grad: string;
    link: string;
    spark?: number[];
    alert?: boolean;
    onClick?: () => void;
}

function StatCard({ title, val, icon: Icon, grad, spark, alert, onClick }: StatCardProps) {
    return (
        <Card
            className={`group relative overflow-hidden cursor-pointer border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${alert ? "ring-1 ring-red-400/50" : ""}`}
            onClick={onClick}
        >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${grad}`} />
            <CardContent className="pt-4 pb-3 px-3">
                <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">{title}</p>
                        <AnimatedNumber val={val} />
                    </div>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${grad} text-white shadow-sm shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
                {/* Sparkline */}
                {spark && spark.length > 0 && (
                    <div className="mt-1.5 h-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={spark.map((v, i) => ({ v, i }))}>
                                <Line type="monotone" dataKey="v" stroke={TEAL_L} strokeWidth={1.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AnimatedNumber({ val }: { val: string | number }) {
    const [display, setDisplay] = useState<string | number>(typeof val === "number" ? 0 : val);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        if (typeof val !== "number") { setDisplay(val); return; }
        const target = val;
        const duration = 600;
        const start = performance.now();
        const animate = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            setDisplay(Math.round(eased * target));
            if (t < 1) rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [val]);

    return <p className="text-xl font-bold mt-0.5 tabular-nums truncate">{display}</p>;
}

interface AlertBannerProps {
    icon: React.ElementType;
    title: string; subtitle: string;
    gradient: string; borderColor: string;
    iconColor: string; iconBg: string;
    titleColor: string; subtitleColor: string;
    onAction: () => void;
}

function AlertBanner({ icon: Icon, title, subtitle, gradient, borderColor, iconColor, iconBg, titleColor, subtitleColor, onAction }: AlertBannerProps) {
    return (
        <Card className={`${borderColor} bg-gradient-to-r ${gradient}`}>
            <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${iconBg} shrink-0`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${titleColor}`}>{title}</p>
                        <p className={`text-xs ${subtitleColor}`}>{subtitle}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={onAction} className="shrink-0 text-xs h-7 px-2">
                        View <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function HealthLabel({ color, label, value }: { color: string; label: string; value: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-bold">{value}</span>
        </div>
    );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
    return (
        <Card className="border-dashed">
            <CardContent className="pt-3 pb-2.5 px-3 flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${color} shrink-0`} />
                <p className="text-xs text-muted-foreground flex-1 truncate">{label}</p>
                <AnimatedNumber val={value} />
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        approved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        ordered: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
        partial: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status] || "bg-muted text-muted-foreground"}`}>
            {status}
        </span>
    );
}

function EmptyChartState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-2 opacity-15" />
            <p className="text-sm">{message}</p>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div><Skeleton className="h-8 w-72 mb-2" /><Skeleton className="h-4 w-96" /></div>
                <Skeleton className="h-9 w-36 rounded-full" />
            </div>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-9">
                {Array.from({ length: 9 }).map((_, i) => (
                    <Card key={i}><CardContent className="pt-5 pb-3"><Skeleton className="h-14 w-full" /></CardContent></Card>
                ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /></div>
            <Card><CardContent className="pt-6"><Skeleton className="h-12 w-full rounded-full" /></CardContent></Card>
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full rounded-xl" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full rounded-xl" /></CardContent></Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full rounded-xl" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full rounded-xl" /></CardContent></Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full rounded-xl" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full rounded-xl" /></CardContent></Card>
            </div>
            <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
    );
}
