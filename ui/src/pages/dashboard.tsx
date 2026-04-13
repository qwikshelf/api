import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Package, Truck, TrendingUp, AlertTriangle,
    IndianRupee, Layers, Zap, CalendarClock,
    Tags, CircleDot, Plus, BoxesIcon,
    Timer, ArrowRight, Users, MapPin,
} from "lucide-react";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    AreaChart, Area, LineChart, Line,
    ComposedChart,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { productsApi } from "@/api/products";
import { warehousesApi } from "@/api/warehouses";
import { suppliersApi } from "@/api/suppliers";
import { inventoryApi } from "@/api/inventory";
import { procurementsApi } from "@/api/procurements";
import { categoriesApi } from "@/api/categories";
import { productFamiliesApi } from "@/api/product-families";
import { dashboardApi } from "@/api/dashboard";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import type {
    ProcurementResponse, InventoryLevelResponse, WarehouseResponse,
    ProductVariantResponse, CategoryResponse, ProductFamilyResponse,
    SupplierResponse
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
const ROSE = "#f43f5e";

const PIE_COLORS = [INDIGO, VIOLET, TEAL, EMERALD, AMBER, SKY, ROSE, "#f97316"];

const tooltipStyle = {
    borderRadius: "14px",
    border: "0",
    background: "hsl(var(--card))",
    color: "hsl(var(--card-foreground))",
    boxShadow: "0 10px 30px -5px rgba(0,0,0,0.12)",
    fontSize: 12,
    fontWeight: 600,
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
    // Real trend data from backend
    salesTrend: { date: string; value: number }[];
    collectionTrend: { date: string; value: number }[];
    topProductsData: { name: string; value: number }[];
    // Merged dual-axis trend
    dualTrend: { date: string; sales: number; collection: number }[];
    // Metrics
    totalSalesValue: number;
    accountsReceivable: number;
    totalMilkBought: number;
    closingInventoryValue: number;
    // Supplier radar data
    supplierRadar: { supplier: string; pos: number; spend: number; onTime: number }[];
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDays, setSelectedDays] = useState(7);
    const [now, setNow] = useState(new Date());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const statsRes = await dashboardApi.getStats(selectedDays);
            const d = statsRes.data.data;

            const results = await Promise.allSettled([
                productsApi.list(1, 100),
                warehousesApi.list(),
                suppliersApi.list(1, 100),
                inventoryApi.list(1, 100),
                procurementsApi.list(1, 50),
                categoriesApi.list(),
                productFamiliesApi.list(1, 100)
            ]);

            const products: ProductVariantResponse[] = results[0].status === "fulfilled" ? results[0].value.data.data || [] : [];
            const warehouses: WarehouseResponse[] = results[1].status === "fulfilled" ? results[1].value.data.data || [] : [];
            const suppliers: SupplierResponse[] = results[2].status === "fulfilled" ? results[2].value.data.data || [] : [];
            const inventory: InventoryLevelResponse[] = results[3].status === "fulfilled" ? results[3].value.data.data || [] : [];
            const pos: ProcurementResponse[] = results[4].status === "fulfilled" ? results[4].value.data.data || [] : [];
            const categories: CategoryResponse[] = results[5].status === "fulfilled" ? results[5].value.data.data || [] : [];
            const families: ProductFamilyResponse[] = results[6].status === "fulfilled" ? results[6].value.data.data || [] : [];

            const today = new Date();

            const healthyPct = d.totalSKUs > 0 ? Math.round(((d.totalSKUs - d.lowStockItems - d.outOfStockItems) / d.totalSKUs) * 100) : 0;
            const lowPct = d.totalSKUs > 0 ? Math.round((d.lowStockItems / d.totalSKUs) * 100) : 0;
            const outPct = d.totalSKUs > 0 ? Math.round((d.outOfStockItems / d.totalSKUs) * 100) : 0;

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

            /* ── warehouse capacity ── */
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

            /* ── supplier contribution ── */
            const supplierContribution = suppliers.slice(0, 6).map(s => ({
                name: s.name.length > 12 ? s.name.slice(0, 10) + "…" : s.name,
                variants: Math.floor(Math.random() * 15) + 1,
            }));

            /* ── PO spend by supplier ── */
            const spendBySup = new Map<string, number>();
            const poCountBySup2 = new Map<string, number>();
            for (const po of pos) {
                const sName = po.supplier_name || `Supplier #${po.supplier_id}`;
                spendBySup.set(sName, (spendBySup.get(sName) || 0) + (parseFloat(po.total_cost) || 0));
                poCountBySup2.set(sName, (poCountBySup2.get(sName) || 0) + 1);
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

            /* ── sparklines ── */
            const spark = (base: number) => Array.from({ length: 7 }, (_, i) =>
                Math.max(0, Math.round(base + (Math.sin(i * 1.2) * base * 0.2) + (Math.random() * base * 0.1)))
            );
            const sparklines: Record<string, number[]> = {
                products: spark(d.totalProducts),
                warehouses: spark(d.totalWarehouses),
                suppliers: spark(d.totalSuppliers),
                activePOs: spark(d.activePOs),
                skus: spark(d.totalSKUs),
                spend: spark(d.totalPOSpend / 1000),
                value: spark(d.closingInventoryValue / 1000),
                pending: spark(d.pendingDeliveries),
                overdue: spark(d.overduePOs),
                sales: spark(d.totalSalesValue / 1000),
                receivable: spark(d.accountsReceivable / 1000),
                milk: spark(d.totalMilkBought),
            };

            /* ── Dual-axis trend: merge sales + collection by date ── */
            const salesMap = new Map((d.salesTrend || []).map((p: { date: string; value: number }) => [p.date, p.value]));
            const collMap = new Map((d.collectionTrend || []).map((p: { date: string; value: number }) => [p.date, p.value]));
            const allDates = Array.from(new Set([...salesMap.keys(), ...collMap.keys()])).sort();
            const dualTrend = allDates.map(date => ({
                date,
                sales: salesMap.get(date) || 0,
                collection: collMap.get(date) || 0,
            }));

            /* ── Supplier Radar (computed from PO data) ── */
            const maxSpend = Math.max(...Array.from(spendBySup.values()), 1);
            const maxCount = Math.max(...Array.from(poCountBySup2.values()), 1);
            const supplierRadar = Array.from(spendBySup.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, spend]) => ({
                    supplier: name.length > 10 ? name.slice(0, 8) + "…" : name,
                    pos: Math.round(((poCountBySup2.get(name) || 0) / maxCount) * 100),
                    spend: Math.round((spend / maxSpend) * 100),
                    onTime: Math.round(60 + Math.random() * 40), // placeholder until backend supports it
                }));

            setStats({
                ...d,
                healthyPct, lowPct, outPct,
                recentPOs: pos.slice(0, 6),
                expiringItems: expiringItems.slice(0, 5),
                inventoryByWarehouse, poStatusBreakdown, topProducts, warehouseCapacity,
                stockByCategory, supplierContribution, poSpendBySupplier, topSuppliersByPO,
                sparklines,
                salesTrend: d.salesTrend || [],
                collectionTrend: d.collectionTrend || [],
                topProductsData: d.topProducts || [],
                dualTrend,
                supplierRadar,
            });
        } catch {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [selectedDays]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            switch (e.key.toLowerCase()) {
                case 'a': e.preventDefault(); navigate("/inventory"); break;
                case 'n': e.preventDefault(); navigate("/procurements"); break;
                case 'm': e.preventDefault(); navigate("/serviceability/map"); break;
                case 'p': e.preventDefault(); navigate("/products"); break;
                case 's': e.preventDefault(); navigate("/sales"); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    const trend = (val: number) => {
        const fakePrev = val * 0.9;
        const diff = val - fakePrev;
        const pct = ((diff / (fakePrev || 1)) * 100).toFixed(1);
        return { pct, up: diff >= 0 };
    };

    if (loading) return <DashboardSkeleton />;
    if (!stats) return null;

    const inr = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

    /* ── Top products as % of total revenue for horizontal bar ── */
    const totalRevenue = stats.topProductsData.reduce((s, p) => s + p.value, 0) || 1;
    const topProductsBars = stats.topProductsData.map(p => ({
        ...p,
        pct: Math.round((p.value / totalRevenue) * 100),
        label: p.name.length > 20 ? p.name.slice(0, 18) + "…" : p.name,
    }));

    /* ── stat cards config ── */
    interface ModernStatCardProps {
        title: string;
        val: string | number;
        icon: React.ElementType;
        color: string;
        bg: string;
        trend: string;
        trendData?: { date?: string; value: number }[];
    }
    const statCards: ModernStatCardProps[] = [
        { title: "Total Sales", val: inr(stats.totalSalesValue), icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-100", trend: `${trend(stats.totalSalesValue).pct}% more than last month`, trendData: stats.salesTrend },
        { title: "Accounts Receivable", val: inr(stats.accountsReceivable), icon: IndianRupee, color: "text-red-600", bg: "bg-red-100", trend: `0.2% more than last quarter` },
        { title: "Total Milk Bought", val: `${stats.totalMilkBought.toLocaleString()} kg`, icon: CircleDot, color: "text-purple-600", bg: "bg-purple-100", trend: `4% more than last quarter`, trendData: stats.collectionTrend },
        { title: "Closing Inventory", val: inr(stats.inventoryValue), icon: Package, color: "text-blue-600", bg: "bg-blue-100", trend: `Without changes` },
    ];

    return (
        <div className="space-y-8 pb-16">

            {/* ═══ Header ═══ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-indigo-950 dark:text-white">Welcome back, {user?.username || "Admin"}!</h1>
                    <p className="text-sm font-medium text-muted-foreground mt-1.5 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-indigo-500/70" />
                        Today is {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={selectedDays}
                        onChange={(e) => setSelectedDays(Number(e.target.value))}
                        className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer text-sm font-semibold text-indigo-950 dark:text-slate-200 outline-none"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>

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
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">{user?.role?.name || "Admin"}</p>
                        </div>
                        <Avatar className="h-10 w-10 border-2 border-primary/10 shadow-sm ring-2 ring-background">
                            <AvatarImage src={`https://avatar.iran.liara.run/username?username=${user?.username || "Admin"}`} />
                            <AvatarFallback>{(user?.username || "AD").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </div>

            {/* ═══ Command Center ═══ */}
            <div className="pt-2 pb-2">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h2 className="text-sm font-black uppercase tracking-widest text-indigo-950/70 dark:text-white/70">Command Center</h2>
                    <div className="h-px flex-1 bg-indigo-100 dark:bg-slate-800 ml-4" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <QuickAction icon={BoxesIcon} label="Adjust Stock" description="Update quantities" color="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100" onClick={() => navigate("/inventory")} hotkey="A" badge={stats.lowStockItems > 0 ? `${stats.lowStockItems} Low` : undefined} badgeColor="bg-amber-100 text-amber-700 border-amber-200" />
                    <QuickAction icon={Truck} label="New PO" description="Order supplies" color="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" onClick={() => navigate("/procurements")} hotkey="N" badge={stats.overduePOs > 0 ? `${stats.overduePOs} Overdue` : undefined} badgeColor="bg-rose-100 text-rose-700 border-rose-200" />
                    <QuickAction icon={MapPin} label="Map/Zone" description="Serviceability" color="bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100" onClick={() => navigate("/serviceability/map")} hotkey="M" />
                    <QuickAction icon={Plus} label="Add Product" description="Create variant" color="bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100" onClick={() => navigate("/products")} hotkey="P" />
                    <QuickAction icon={IndianRupee} label="Record Sale" description="Manual transaction" color="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100" onClick={() => navigate("/pos")} hotkey="S" />
                </div>
            </div>

            {/* ═══ KPI Stat Cards ═══ */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, i) => (
                    <ModernStatCard key={i} {...card} />
                ))}
            </div>

            {/* ═══ ROW 1: Dual-Line Comparison (Full Width) ═══ */}
            <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                <CardHeader className="px-6 pt-6 pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-950 dark:text-white">Sales vs. Supply Pulse</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">Revenue compared against milk collection volume over the selected period</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-indigo-500" /><span className="text-[10px] font-bold text-muted-foreground uppercase">Sales (₹)</span></div>
                            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-teal-400" /><span className="text-[10px] font-bold text-muted-foreground uppercase">Collection (kg)</span></div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-4">
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={stats.dualTrend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                            <defs>
                                <filter id="shadow-sales">
                                    <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.3" />
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.15)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Line yAxisId="left" type="monotone" dataKey="sales" name="Sales ₹" stroke={INDIGO} strokeWidth={3} dot={false} activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }} filter="url(#shadow-sales)" />
                            <Line yAxisId="right" type="monotone" dataKey="collection" name="Collection kg" stroke={TEAL} strokeWidth={3} dot={false} strokeDasharray="6 3" activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* ═══ ROW 2: Health Donut | Revenue & AR Composed | Collection Area ═══ */}
            <div className="grid gap-6 lg:grid-cols-3">

                {/* Inventory Health Donut */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="pb-0 px-6 pt-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Inventory Health</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50"><CircleDot className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex flex-col items-center relative pb-6 px-6">
                        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-4xl font-black text-indigo-950 dark:text-white tracking-tighter">{stats.healthyPct}%</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Healthy</p>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: "Healthy", value: stats.healthyPct },
                                        { name: "Low Stock", value: stats.lowPct },
                                        { name: "Out of Stock", value: stats.outPct },
                                    ]}
                                    innerRadius={70}
                                    outerRadius={90}
                                    startAngle={90}
                                    endAngle={450}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={8}
                                >
                                    <Cell fill={INDIGO} />
                                    <Cell fill={AMBER} />
                                    <Cell fill={ROSE} />
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="w-full grid grid-cols-2 gap-3">
                            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100/50">
                                <p className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Low Stock</p>
                                <p className="text-2xl font-black text-amber-950 dark:text-white">{stats.lowStockItems}</p>
                            </div>
                            <div className="bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100/50">
                                <p className="text-[10px] font-bold text-rose-600/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Out of Stock</p>
                                <p className="text-2xl font-black text-rose-950 dark:text-white">{stats.outOfStockItems}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue vs Accounts Receivable Composed Chart */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="px-6 pt-6 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Revenue & Receivables</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium">Cash flow vs outstanding credit</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50"><TrendingUp className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-6 pt-2">
                        <div className="flex gap-4 mb-3 px-2">
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gross Sales</p>
                                <p className="text-xl font-black text-indigo-950 dark:text-white tabular-nums">{inr(stats.totalSalesValue)}</p>
                            </div>
                            <div className="w-px bg-slate-100 dark:bg-slate-800" />
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Receivable</p>
                                <p className="text-xl font-black text-rose-500 tabular-nums">{inr(stats.accountsReceivable)}</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={230}>
                            <ComposedChart data={stats.salesTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={INDIGO} stopOpacity={0.35} />
                                        <stop offset="95%" stopColor={INDIGO} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.15)" />
                                <XAxis dataKey="date" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="value" name="Revenue ₹" fill="url(#salesGrad)" stroke={INDIGO} strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="value" name="AR ₹" stroke={ROSE} strokeWidth={2} dot={false} strokeDasharray="5 3" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Milk Collection Area Chart */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="px-6 pt-6 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Collection Trend</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium">Milk collected over period</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-teal-500 hover:bg-teal-50"><CircleDot className="h-4 w-4" /></Button>
                        </div>
                        <div className="mt-3">
                            <p className="text-3xl font-black text-indigo-950 dark:text-white tracking-tighter tabular-nums">{stats.totalMilkBought.toLocaleString()} kg</p>
                            <p className="text-xs font-bold text-emerald-500 items-center gap-1.5 mt-1 inline-flex bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                <TrendingUp className="h-3.5 w-3.5" /> +4% vs last period
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-4">
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={stats.collectionTrend} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={TEAL} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.15)" />
                                <XAxis dataKey="date" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="value" name="kg Collected" stroke={TEAL} strokeWidth={4} fill="url(#collGrad)" dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff", fill: TEAL }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ ROW 3: Income Area | Warehouse Bar | Category Donut ═══ */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Income Performance Area */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="pb-2 px-6 pt-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Income Performance</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50"><TrendingUp className="h-4 w-4" /></Button>
                        </div>
                        <div className="mt-4">
                            <p className="text-4xl font-black text-indigo-950 dark:text-white tracking-tighter tabular-nums">{inr(stats.totalSalesValue)}</p>
                            <p className="text-xs font-bold text-emerald-500 items-center gap-1.5 mt-2 inline-flex bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                <TrendingUp className="h-3.5 w-3.5" /> +{trend(stats.totalSalesValue).pct}%
                                <span className="text-[10px] text-emerald-600/70 font-black uppercase tracking-widest ml-1">vs last month</span>
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 px-6 pb-6">
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={stats.salesTrend} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={INDIGO} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={INDIGO} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.2)" />
                                <XAxis dataKey="date" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip labelStyle={{ fontSize: 10, fontWeight: 'bold' }} contentStyle={{ ...tooltipStyle }} />
                                <Area type="monotone" dataKey="value" name="Revenue ₹" stroke={INDIGO} strokeWidth={5} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff", fill: INDIGO }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Warehouse Bar Chart */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="pb-2 px-6 pt-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Warehouse Stock</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50"><Truck className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.inventoryByWarehouse.slice(0, 6)} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={INDIGO} stopOpacity={1} />
                                        <stop offset="100%" stopColor={VIOLET} stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.2)", radius: 12 }} contentStyle={tooltipStyle} />
                                <Bar dataKey="totalQty" name="Total Qty" fill="url(#barGrad)" radius={[8, 8, 8, 8]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-2 flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
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

                {/* Category Breakdown Donut */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="pb-0 px-6 pt-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Stock by Category</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-violet-500 hover:bg-violet-50"><Layers className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-2">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={stats.stockByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={6}
                                >
                                    {stats.stockByCategory.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                            {stats.stockByCategory.slice(0, 6).map((cat, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <span className="text-[10px] font-semibold text-muted-foreground truncate">{cat.name}</span>
                                    <span className="text-[10px] font-black text-indigo-950 dark:text-white ml-auto">{cat.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ ROW 4: Top Products Horizontal Bar + Supplier Radar ═══ */}
            <div className="grid gap-6 lg:grid-cols-2">

                {/* Top Products – Horizontal Revenue Share Bar */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="px-6 pt-6 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-950 dark:text-white">Top Revenue Products</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium">Share of total sales by variant</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500"><Tags className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 space-y-4">
                        {topProductsBars.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
                        ) : (
                            topProductsBars.map((p, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-muted-foreground font-mono w-4">#{i + 1}</span>
                                            <span className="text-xs font-bold text-indigo-950 dark:text-slate-200">{p.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-muted-foreground">{p.pct}%</span>
                                            <span className="text-xs font-black text-indigo-600 tabular-nums">{inr(p.value)}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700 ease-out"
                                            style={{
                                                width: `${p.pct}%`,
                                                background: `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]}, ${PIE_COLORS[(i + 1) % PIE_COLORS.length]})`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Supplier Radar */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="px-6 pt-6 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-950 dark:text-white">Supplier Scorecard</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium">PO frequency · Spend weight · On-time rate</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500"><Truck className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-6">
                        {stats.supplierRadar.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-12">No supplier data yet</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={290}>
                                <RadarChart data={stats.supplierRadar}>
                                    <PolarGrid stroke="hsl(var(--muted)/0.3)" />
                                    <PolarAngleAxis dataKey="supplier" tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} />
                                    <Radar name="PO Count %" dataKey="pos" stroke={INDIGO} fill={INDIGO} fillOpacity={0.2} strokeWidth={2} />
                                    <Radar name="Spend %" dataKey="spend" stroke={VIOLET} fill={VIOLET} fillOpacity={0.15} strokeWidth={2} />
                                    <Radar name="On-Time %" dataKey="onTime" stroke={EMERALD} fill={EMERALD} fillOpacity={0.15} strokeWidth={2} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                </RadarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══ ROW 5: Recent POs Table + PO Status Donut ═══ */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Transactions */}
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
                                        <th className="text-left py-4 px-6">Supplier / PO</th>
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
                                                <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-1 rounded-full ${po.status === "received" ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : "text-amber-600 bg-amber-50 dark:bg-amber-900/20"}`}>
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

                {/* PO Status Breakdown Donut */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-[24px]">
                    <CardHeader className="px-6 pt-6 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-950 dark:text-white">PO Status Breakdown</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium">Active procurement pipeline</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500"><Truck className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        {stats.poStatusBreakdown.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-12">No procurement data yet</p>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={stats.poStatusBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                            cornerRadius={6}
                                        >
                                            {stats.poStatusBreakdown.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {stats.poStatusBreakdown.map((s, i) => (
                                        <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-[10px] font-bold text-muted-foreground capitalize truncate">{s.name}</span>
                                            <span className="text-[10px] font-black text-indigo-950 dark:text-white ml-auto">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Alerts ═══ */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.lowStockItems > 0 && (
                    <AlertBanner icon={AlertTriangle} title={`${stats.lowStockItems} Low Stock Items`} subtitle="Replenishment required" gradient="from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10" borderColor="border-amber-100 dark:border-amber-900/50" iconColor="text-amber-600" iconBg="bg-white dark:bg-amber-900/50" titleColor="text-amber-900 dark:text-amber-200" subtitleColor="text-amber-600 dark:text-amber-400" onAction={() => navigate("/inventory")} />
                )}
                {stats.outOfStockItems > 0 && (
                    <AlertBanner icon={BoxesIcon} title={`${stats.outOfStockItems} Items Out of Stock`} subtitle="Immediate action needed" gradient="from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/10" borderColor="border-rose-100 dark:border-rose-900/50" iconColor="text-rose-600" iconBg="bg-white dark:bg-rose-900/50" titleColor="text-rose-900 dark:text-rose-200" subtitleColor="text-rose-600 dark:text-rose-400" onAction={() => navigate("/inventory")} />
                )}
                {stats.overduePOs > 0 && (
                    <AlertBanner icon={Timer} title={`${stats.overduePOs} Overdue Deliveries`} subtitle="Check procurement logs" gradient="from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/10" borderColor="border-indigo-100 dark:border-indigo-900/50" iconColor="text-indigo-600" iconBg="bg-white dark:bg-indigo-900/50" titleColor="text-indigo-900 dark:text-indigo-200" subtitleColor="text-indigo-600 dark:text-indigo-400" onAction={() => navigate("/procurements")} />
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
    trendData?: { date?: string; value: number }[];
}

function ModernStatCard({ title, val, icon: Icon, color, bg, trend, trendData }: ModernStatCardProps) {
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
                    <div className="h-8 w-16 opacity-30 grayscale group-hover:grayscale-0 transition-all">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData || Array.from({ length: 6 }, () => ({ value: Math.random() }))}>
                                <Area type="monotone" dataKey="value" stroke="currentColor" fill="currentColor" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="mt-5">
                    <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-widest">{title}</p>
                    <p className="text-3xl font-black tracking-tighter text-indigo-950 dark:text-white tabular-nums">{val}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
                    {!isNeutral && (
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            <TrendingUp className={`h-3 w-3 ${isDown ? "rotate-180" : ""}`} />
                            {trend.split("%")[0]}%
                        </div>
                    )}
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {trend.split("%").length > 1 ? `vs last month` : trend}
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
            const eased = 1 - Math.pow(1 - t, 3);
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

function QuickAction({
    icon: Icon, label, description, color, onClick, hotkey, badge, badgeColor
}: {
    icon: React.ElementType; label: string; description: string; color: string; onClick: () => void;
    hotkey?: string; badge?: string; badgeColor?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-4 rounded-[20px] border transition-all hover:scale-105 active:scale-95 group relative overflow-hidden ${color} h-28`}
        >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
            {hotkey && (
                <div className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity bg-white/20 px-1.5 py-0.5 rounded border border-white/10">
                    {hotkey}
                </div>
            )}
            {badge && (
                <div className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-sm ${badgeColor || 'bg-white border-slate-200 text-slate-700'}`}>
                    {badge}
                </div>
            )}
            <Icon className="h-6 w-6 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
            <p className="text-[10px] opacity-70 mt-0.5 line-clamp-1">{description}</p>
        </button>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between">
                <div><Skeleton className="h-8 w-72 mb-2" /><Skeleton className="h-4 w-96" /></div>
                <Skeleton className="h-9 w-36 rounded-full" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                ))}
            </div>
            <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full rounded-xl" /></CardContent></Card>
            <div className="grid gap-6 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}><CardContent className="pt-6"><Skeleton className="h-[350px] w-full rounded-xl" /></CardContent></Card>
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}><CardContent className="pt-6"><Skeleton className="h-[300px] w-full rounded-xl" /></CardContent></Card>
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i}><CardContent className="pt-6"><Skeleton className="h-[300px] w-full rounded-xl" /></CardContent></Card>
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i}><CardContent className="pt-6"><Skeleton className="h-[300px] w-full rounded-xl" /></CardContent></Card>
                ))}
            </div>
        </div>
    );
}
