import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Package, Truck, ShoppingCart, TrendingUp,
    AlertTriangle, IndianRupee, Layers,
    Zap, CalendarClock,
    Tags, CircleDot, Check,
    Plus, BoxesIcon, Timer, Clock, ArrowRight,
    Users,
} from "lucide-react";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { productsApi } from "@/api/products";
import { warehousesApi } from "@/api/warehouses";
import { suppliersApi } from "@/api/suppliers";
import { inventoryApi } from "@/api/inventory";
import { procurementsApi } from "@/api/procurements";
import { categoriesApi } from "@/api/categories";
import { usersApi } from "@/api/users";
import { productFamiliesApi } from "@/api/product-families";
import { salesApi } from "@/api/sales";
import { collectionsApi } from "@/api/collections";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
    ProcurementResponse, InventoryLevelResponse, WarehouseResponse,
    ProductVariantResponse, CategoryResponse, ProductFamilyResponse,
    SupplierResponse, SaleResponse, CollectionResponse
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";

/* ═══════════════════════════════════════════════════
   PALETTE
   ═══════════════════════════════════════════════════ */
const TEAL = "hsl(174, 60%, 41%)";
const AMBER = "hsl(38, 92%, 50%)";
const INDIGO = "#6366f1";
const VIOLET = "#8b5cf6";
const EMERALD = "#10b981";
const SKY = "#0ea5e9";

const PIE_COLORS = ["#8b5cf6", "#fb923c", "#f472b6", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b"];

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
    // New metrics
    totalSalesValue: number;
    accountsReceivable: number;
    totalMilkBought: number;
    closingInventoryValue: number;
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

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [productsRes, warehousesRes, suppliersRes, inventoryRes, posRes, catsRes, usersRes, familiesRes, salesRes, collectionsRes] =
                await Promise.all([
                    productsApi.list(1, 500),
                    warehousesApi.list(),
                    suppliersApi.list(1, 200),
                    inventoryApi.list(1, 1000),
                    procurementsApi.list(1, 200),
                    categoriesApi.list(),
                    usersApi.list(1, 1),
                    productFamiliesApi.list(1, 200),
                    salesApi.getHistory(1, 1000),
                    collectionsApi.list(1, 1000),
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
            const sales: SaleResponse[] = salesRes.data.data || [];
            const collections: CollectionResponse[] = collectionsRes.data.data || [];

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

            /* ── new financial metrics ── */
            const totalSalesValue = sales.reduce((s, sale) => s + (parseFloat(sale.total_amount) || 0), 0);
            const accountsReceivable = sales
                .filter(sale => sale.payment_method === "credit")
                .reduce((s, sale) => s + (parseFloat(sale.total_amount) || 0), 0);

            /* ── milk metrics ── */
            const milkVariants = products.filter(p => p.name.toLowerCase().includes("milk")).map(p => p.id);
            const totalMilkBought = collections
                .filter(c => milkVariants.includes(c.variant_id))
                .reduce((s, c) => s + (parseFloat(c.weight) || 0), 0);

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
            const closingInventoryValue = inventory.reduce((sum, inv) => {
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
                value: spark(closingInventoryValue / 1000),
                pending: spark(pendingDeliveries),
                overdue: spark(overduePOs),
                sales: spark(totalSalesValue / 1000),
                receivable: spark(accountsReceivable / 1000),
                milk: spark(totalMilkBought),
            };

            setStats({
                totalProducts, totalWarehouses: warehouses.length, totalSuppliers,
                totalCategories: categories.length, totalUsers, totalFamilies: families.length,
                activePOs, totalSKUs, lowStockItems, outOfStockItems, totalPOSpend,
                pendingDeliveries, overduePOs, inventoryValue: closingInventoryValue,
                healthyPct, lowPct, outPct,
                recentPOs: pos.slice(0, 6),
                expiringItems: expiringItems.slice(0, 5),
                inventoryByWarehouse, poStatusBreakdown, topProducts, warehouseCapacity,
                stockByCategory, supplierContribution, poSpendBySupplier, topSuppliersByPO,
                sparklines,
                totalSalesValue, accountsReceivable, totalMilkBought, closingInventoryValue,
            });
        } catch {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        load();
    }, [load]);

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const trend = (val: number) => {
        const fakePrev = val * 0.9;
        const diff = val - fakePrev;
        const pct = ((diff / (fakePrev || 1)) * 100).toFixed(1);
        return { pct, up: diff >= 0 };
    };

    if (loading) return <DashboardSkeleton />;
    if (!stats) return null;

    /* ── format helpers ── */
    const inr = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

    /* ── stat cards config ── */
    const statCards: ModernStatCardProps[] = [
        {
            title: "Total Sales",
            val: inr(stats.totalSalesValue),
            icon: TrendingUp,
            color: "text-orange-600",
            bg: "bg-orange-100",
            trend: `${trend(stats.totalSalesValue).pct}% more than last month`
        },
        {
            title: "Accounts Receivable",
            val: inr(stats.accountsReceivable),
            icon: IndianRupee,
            color: "text-red-600",
            bg: "bg-red-100",
            trend: `0.2% more than last quarter`
        },
        {
            title: "Total Milk Bought",
            val: `${stats.totalMilkBought.toLocaleString()} kg`,
            icon: CircleDot,
            color: "text-purple-600",
            bg: "bg-purple-100",
            trend: `4% more than last quarter`
        },
        {
            title: "Closing Inventory",
            val: inr(stats.inventoryValue),
            icon: Package,
            color: "text-blue-600",
            bg: "bg-blue-100",
            trend: `Without changes`
        },
    ];


    return (
        <div className="space-y-6 pb-12">
            {/* ═══ Header Section ═══ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome {user?.username || "Admin"}!</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Today is {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-sm">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Sep 11 — Oct 10</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                            <Layers className="h-4 w-4" /> Monthly
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                            <AlertTriangle className="h-4 w-4 rotate-12" /> Filter
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                            <Plus className="h-4 w-4" /> Export
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 pl-4 border-l ml-2">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold leading-none">{user?.username || "Admin"}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">System Administrator</p>
                        </div>
                        <Avatar className="h-10 w-10 border-2 border-primary/10 shadow-sm ring-2 ring-background">
                            <AvatarImage src={`https://avatar.iran.liara.run/username?username=${user?.username || "Admin"}`} />
                            <AvatarFallback>{(user?.username || "AD").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </div>

            {/* ═══ Top Row: Stylized Stat Cards ═══ */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, i) => (
                    <ModernStatCard key={i} {...card} />
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

            {/* ═══ Middle Row: Advanced Charts ═══ */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Radial: Category Breakdown */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">Inventory Breakdown</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Zap className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center pt-4">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={stats.stockByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.stockByCategory.map((_, i) => (
                                        <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="w-full mt-4 flex items-center justify-center gap-6">
                            {stats.stockByCategory.slice(0, 3).map((c, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <span className="text-xl font-bold">{c.value}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        {c.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Bar: Procurement Trends */}
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">Annual Procurement</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Zap className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={stats.inventoryByWarehouse} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} contentStyle={tooltipStyle} />
                                <Bar dataKey="totalQty" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="items" fill="#fb923c" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="totalQty" fill="#f472b6" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex items-center justify-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                <div className="h-2 w-2 rounded-full bg-indigo-500" /> Net salary
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                <div className="h-2 w-2 rounded-full bg-orange-400" /> Tax
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                <div className="h-2 w-2 rounded-full bg-pink-400" /> Loan
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Area: Sales Performance */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">Total Sales Trend</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Zap className="h-4 w-4" /></Button>
                        </div>
                        <div className="mt-2 text-2xl font-bold">{inr(stats.totalSalesValue)}</div>
                        <div className="text-emerald-500 text-xs font-bold flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3.5 w-3.5" /> 21% vs last month
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-end pt-6">
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={stats.sparklines.sales.map((v, i) => ({ v, i }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={3} fill="url(#salesGrad)" />
                                <XAxis dataKey="i" hide />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="w-full flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-4">
                            <span>30 Sep</span>
                            <span>10 Oct</span>
                            <span>20 Oct</span>
                            <span>30 Oct</span>
                            <span>10 Nov</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Bottom Row: Tables ═══ */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Sales Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-bold">Recent Transactions</CardTitle>
                        <Button variant="ghost" size="icon" className="h-4 w-4"><Zap className="h-4 w-4" /></Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider border-b">
                                    <tr>
                                        <th className="text-left pb-3 font-bold">S/N</th>
                                        <th className="text-left pb-3 font-bold">Subject</th>
                                        <th className="text-left pb-3 font-bold">Date</th>
                                        <th className="text-left pb-3 font-bold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {stats.recentPOs.slice(0, 4).map((po, i) => (
                                        <tr key={po.id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="py-3 font-mono text-[11px]">{String(i + 1).padStart(2, "0")}</td>
                                            <td className="py-3">
                                                <p className="font-semibold text-xs">{po.supplier_name}</p>
                                                <p className="text-[10px] text-muted-foreground">PO-{po.id}</p>
                                            </td>
                                            <td className="py-3 text-[11px] text-muted-foreground">
                                                {new Date(po.created_at).toLocaleDateString("en-IN")}
                                            </td>
                                            <td className="py-3">
                                                <span className={`text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded ${po.status === "received" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                                                    }`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Suppliers / Budget History mockup */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-bold">Procurement History</CardTitle>
                        <Button variant="ghost" size="icon" className="h-4 w-4"><Zap className="h-4 w-4" /></Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider border-b">
                                    <tr>
                                        <th className="text-left pb-3 font-bold">S/N</th>
                                        <th className="text-left pb-3 font-bold">Ref No.</th>
                                        <th className="text-right pb-3 font-bold">Amount</th>
                                        <th className="text-right pb-3 font-bold">Units</th>
                                        <th className="text-right pb-3 font-bold">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {stats.recentPOs.slice(4, 8).map((po, i) => (
                                        <tr key={po.id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="py-3 font-mono text-[11px]">{String(i + 1).padStart(2, "0")}</td>
                                            <td className="py-3 font-mono text-[11px]">{String(po.id).padStart(8, "0")}</td>
                                            <td className="py-3 text-right font-semibold text-xs">{inr(parseFloat(po.total_cost))}</td>
                                            <td className="py-3 text-right text-[11px] text-muted-foreground">
                                                {po.items?.length || 0} items
                                            </td>
                                            <td className="py-3 text-right text-[11px] text-muted-foreground">
                                                {new Date(po.created_at).toLocaleDateString("en-IN")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Charts Row 2: Recent POs + Top Suppliers + Expiring ═══ */}
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

interface ModernStatCardProps {
    title: string;
    val: string | number;
    icon: React.ElementType;
    color: string;
    bg: string;
    trend: string;
}

function ModernStatCard({ title, val, icon: Icon, color, bg, trend }: ModernStatCardProps) {
    const isUp = trend.includes("more");
    const isDown = trend.includes("less");
    const isNeutral = !isUp && !isDown;

    return (
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${bg} shrink-0 shadow-sm`}>
                        <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-3xl font-bold tracking-tight truncate">{val}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">{title}</p>
                    </div>
                </div>
                <div className="mt-6 flex items-center gap-1.5 px-1">
                    {!isNeutral && (
                        <TrendingUp className={`h-3.5 w-3.5 ${isUp ? "text-emerald-500" : "text-rose-500"} ${isDown ? "rotate-180" : ""}`} />
                    )}
                    {isNeutral && <Check className="h-3.5 w-3.5 text-blue-500" />}
                    <span className={`text-xs font-semibold ${isUp ? "text-emerald-600" : isDown ? "text-rose-600" : "text-blue-600"}`}>
                        {trend}
                    </span>
                </div>
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
