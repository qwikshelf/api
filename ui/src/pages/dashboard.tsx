import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Package, Truck, TrendingUp, AlertTriangle,
    IndianRupee, Layers, Zap, CalendarClock,
    Tags, CircleDot, Plus, BoxesIcon,
    Timer, ArrowRight, Users,
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
import type {
    ProcurementResponse, InventoryLevelResponse, WarehouseResponse,
    ProductVariantResponse, CategoryResponse, ProductFamilyResponse,
    SupplierResponse, SaleResponse, CollectionResponse
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                    <h1 className="text-3xl font-bold tracking-tight text-indigo-950 dark:text-white">Welcome back, {user?.username || "Admin"}!</h1>
                    <p className="text-sm font-medium text-muted-foreground mt-1.5 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-indigo-500/70" />
                        Today is {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <CalendarClock className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-semibold text-indigo-950 dark:text-slate-200">Sep 11 — Oct 10</span>
                        <div className="h-4 w-px bg-indigo-100 mx-1" />
                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Monthly</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-10 rounded-xl border-indigo-100 dark:border-slate-800 gap-2 font-semibold hover:bg-indigo-50 transition-colors">
                            <AlertTriangle className="h-4 w-4 text-indigo-500" /> Filter
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 rounded-xl border-indigo-100 dark:border-slate-800 gap-2 font-semibold hover:bg-indigo-50 transition-colors">
                            <Plus className="h-4 w-4 text-indigo-500" /> Export
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

            {/* ═══ Middle Row: Advanced Charts ═══ */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Donut: Category Breakdown */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="pb-0 px-6 pt-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Inventory Health</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50"><CircleDot className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex flex-col items-center relative pb-6 px-6">
                        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-4xl font-black text-indigo-950 dark:text-white tracking-tighter">{stats.healthyPct}%</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Healthy</p>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: "Healthy", value: stats.healthyPct },
                                        { name: "Low/Out", value: 100 - stats.healthyPct }
                                    ]}
                                    innerRadius={75}
                                    outerRadius={95}
                                    startAngle={90}
                                    endAngle={450}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={10}
                                >
                                    <Cell fill="#6366f1" />
                                    <Cell fill="#f1f5f9" className="dark:fill-slate-800" />
                                </Pie>
                                <Tooltip contentStyle={{ ...tooltipStyle, borderRadius: "12px" }} />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="w-full mt-2 grid grid-cols-2 gap-3">
                            <div className="bg-indigo-50/30 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                                <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Low Stock
                                </p>
                                <p className="text-2xl font-black text-indigo-950 dark:text-white">{stats.lowStockItems}</p>
                            </div>
                            <div className="bg-rose-50/30 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100/50 dark:border-rose-900/30">
                                <p className="text-[10px] font-bold text-rose-600/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Out of Stock
                                </p>
                                <p className="text-2xl font-black text-rose-950 dark:text-white">{stats.outOfStockItems}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bar: Procurement Trends */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="pb-2 px-6 pt-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Supply Trends</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50"><Truck className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={stats.inventoryByWarehouse.slice(0, 6)} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.2)", radius: 12 }} contentStyle={{ ...tooltipStyle, borderRadius: "12px" }} />
                                <Bar dataKey="totalQty" fill="url(#barGrad)" radius={[8, 8, 8, 8]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-6 flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Volume</span>
                            </div>
                            <span className="text-xs font-black text-indigo-950 dark:text-white tabular-nums">
                                {stats.inventoryByWarehouse.reduce((s, w) => s + w.totalQty, 0).toLocaleString()} Units
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Area: Income Trend */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="pb-2 px-6 pt-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Income Performance</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50"><TrendingUp className="h-4 w-4" /></Button>
                        </div>
                        <div className="mt-4">
                            <p className="text-4xl font-black text-indigo-950 dark:text-white tracking-tighter tabular-nums">{inr(stats.totalSalesValue)}</p>
                            <p className="text-xs font-bold text-emerald-500 items-center gap-1.5 mt-2 inline-flex bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                <TrendingUp className="h-3.5 w-3.5" /> +21.4%
                                <span className="text-[10px] text-emerald-600/70 font-black uppercase tracking-widest ml-1">vs last month</span>
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 px-6 pb-6">
                        <ResponsiveContainer width="100%" height={210}>
                            <AreaChart data={stats.sparklines.sales.map((v, i) => ({ v, i }))} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.2)" />
                                <XAxis dataKey="i" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip contentStyle={{ ...tooltipStyle, borderRadius: "16px", border: "0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} />
                                <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={5} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff", fill: "#6366f1" }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Bottom Row: Tables ═══ */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Sales Table */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 bg-slate-50/50 dark:bg-slate-800/30 px-6">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-950 dark:text-white">Recent Transactions</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500"><Zap className="h-4 w-4" /></Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                                    <tr>
                                        <th className="text-left py-4 px-6">S/N</th>
                                        <th className="text-left py-4 px-6">Customer / Ref</th>
                                        <th className="text-left py-4 px-6">Date</th>
                                        <th className="text-right py-4 px-6">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {stats.recentPOs.slice(0, 5).map((po, i) => (
                                        <tr key={po.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                            <td className="py-4 px-6 font-mono text-[11px] font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
                                            <td className="py-4 px-6">
                                                <p className="font-bold text-indigo-950 dark:text-slate-200 text-xs">{po.supplier_name}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono">PO-{po.id}</p>
                                            </td>
                                            <td className="py-4 px-6 text-[11px] font-semibold text-muted-foreground">
                                                {new Date(po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-1 rounded-full ${po.status === "received" ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
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

                {/* Procurement History */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 bg-slate-50/50 dark:bg-slate-800/30 px-6">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-950 dark:text-white">Supply Dynamics</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500"><Truck className="h-4 w-4" /></Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                                    <tr>
                                        <th className="text-left py-4 px-6">ID</th>
                                        <th className="text-left py-4 px-6">Supplier</th>
                                        <th className="text-right py-4 px-6">Cost</th>
                                        <th className="text-right py-4 px-6">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {stats.poSpendBySupplier.slice(0, 5).map((s, i) => (
                                        <tr key={i} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                            <td className="py-4 px-6 font-mono text-[11px] font-bold text-muted-foreground">#{i + 1}</td>
                                            <td className="py-4 px-6">
                                                <p className="font-bold text-indigo-950 dark:text-slate-200 text-xs">{s.name}</p>
                                            </td>
                                            <td className="py-4 px-6 text-right font-mono text-[11px] font-black text-indigo-600">
                                                {inr(s.spend)}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="w-20 ml-auto h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.random() * 60 + 40}%` }} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Alert Section ═══ */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.lowStockItems > 0 && (
                    <AlertBanner
                        icon={AlertTriangle}
                        title={`${stats.lowStockItems} Low Stock Items`}
                        subtitle="Replenishment required"
                        gradient="from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10"
                        borderColor="border-amber-100 dark:border-amber-900/50"
                        iconColor="text-amber-600"
                        iconBg="bg-white dark:bg-amber-900/50"
                        titleColor="text-amber-900 dark:text-amber-200"
                        subtitleColor="text-amber-600 dark:text-amber-400"
                        onAction={() => navigate("/inventory")}
                    />
                )}
                {stats.outOfStockItems > 0 && (
                    <AlertBanner
                        icon={BoxesIcon}
                        title={`${stats.outOfStockItems} Items Out of Stock`}
                        subtitle="Immediate action needed"
                        gradient="from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/10"
                        borderColor="border-rose-100 dark:border-rose-900/50"
                        iconColor="text-rose-600"
                        iconBg="bg-white dark:bg-rose-900/50"
                        titleColor="text-rose-900 dark:text-rose-200"
                        subtitleColor="text-rose-600 dark:text-rose-400"
                        onAction={() => navigate("/inventory")}
                    />
                )}
                {stats.overduePOs > 0 && (
                    <AlertBanner
                        icon={Timer}
                        title={`${stats.overduePOs} Overdue Deliveries`}
                        subtitle="Check procurement logs"
                        gradient="from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/10"
                        borderColor="border-indigo-100 dark:border-indigo-900/50"
                        iconColor="text-indigo-600"
                        iconBg="bg-white dark:bg-indigo-900/50"
                        titleColor="text-indigo-900 dark:text-indigo-200"
                        subtitleColor="text-indigo-600 dark:text-indigo-400"
                        onAction={() => navigate("/procurements")}
                    />
                )}
            </div>

            {/* ═══ System Mini-Stats ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat icon={Users} label="Users" value={stats.totalUsers} color="text-indigo-500" />
                <MiniStat icon={Tags} label="Categories" value={stats.totalCategories} color="text-violet-500" />
                <MiniStat icon={Layers} label="Product Families" value={stats.totalFamilies} color="text-blue-500" />
                <MiniStat icon={Package} label="Product Variants" value={stats.totalProducts} color="text-emerald-500" />
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
        <Card className="border-0 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[24px] overflow-hidden group">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className={`p-4 rounded-2xl ${bg} shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                        <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                    {/* Tiny sparkline placeholder if needed, or just keep it clean */}
                    <div className="h-8 w-16 opacity-30 grayscale group-hover:grayscale-0 transition-all">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={Array.from({ length: 6 }, () => ({ v: Math.random() }))}>
                                <Area type="monotone" dataKey="v" stroke="currentColor" fill="currentColor" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="mt-5">
                    <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-widest">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black tracking-tighter text-indigo-950 dark:text-white tabular-nums">{val}</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        {!isNeutral && (
                            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                <TrendingUp className={`h-3 w-3 ${isDown ? "rotate-180" : ""}`} />
                                {trend.split("%")[0]}%
                            </div>
                        )}
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {trend.split("%").length > 1 ? `vs last month` : trend}
                        </span>
                    </div>
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
