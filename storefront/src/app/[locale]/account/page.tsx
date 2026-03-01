"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/store/use-auth";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import axios from "axios";
import {
    User as UserIcon,
    Package,
    MapPin,
    Phone,
    Calendar,
    ChevronRight,
    Clock,
    CheckCircle2,
    ShoppingBag,
    Loader2,
    LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
    id: number;
    status: string;
    total_amount: string;
    created_at: string;
}

interface OrderItem {
    id: number;
    variant_id: number;
    quantity: number;
    unit_price: number;
}

interface OrderDetails extends Order {
    items: OrderItem[];
}

export default function AccountPage() {
    const t = useTranslations('Account');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, logout } = useAuth();
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login?redirect=/account");
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        if (activeTab === "orders" && isAuthenticated) {
            fetchOrders();
        }
    }, [activeTab, isAuthenticated]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const resp = await api.get("/public/my/orders");
            setOrders(resp.data.data || []);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                console.error("Failed to fetch orders", err.response?.data?.message || err.message);
            } else {
                console.error("Failed to fetch orders", err);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetails = async (id: number) => {
        setLoading(true);
        try {
            const resp = await api.get(`/public/my/orders/${id}`);
            setSelectedOrder(resp.data.data);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                console.error("Failed to fetch order details", err.response?.data?.message || err.message);
            } else {
                console.error("Failed to fetch order details", err);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated || !user) return null;

    return (
        <main className="min-h-screen pt-24 pb-12 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="w-full md:w-64 space-y-2">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <UserIcon className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="font-bold text-slate-900 truncate">{user.full_name}</h2>
                            <p className="text-xs text-slate-500 truncate">{user.username}</p>
                        </div>

                        <button
                            onClick={() => setActiveTab("profile")}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                                activeTab === "profile"
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "bg-white text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            <UserIcon className="w-5 h-5" />
                            {t('Sidebar.myProfile')}
                        </button>

                        <button
                            onClick={() => setActiveTab("orders")}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                                activeTab === "orders"
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "bg-white text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            <Package className="w-5 h-5" />
                            {t('Sidebar.orderHistory')}
                        </button>

                        <button
                            onClick={() => logout()}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 bg-white hover:bg-red-50 transition-colors mt-8"
                        >
                            <LogOut className="w-5 h-5" />
                            {t('Sidebar.signOut')}
                        </button>
                    </aside>

                    {/* Main Content */}
                    <section className="flex-1">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            {activeTab === "profile" && (
                                <div className="p-8">
                                    <h1 className="text-2xl font-bold text-slate-900 mb-8">{t('Profile.personalInfo')}</h1>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Profile.fullName')}</p>
                                            <p className="text-slate-900 font-medium">{user.full_name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Profile.username')}</p>
                                            <p className="text-slate-900 font-medium">{user.username}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Profile.phone')}</p>
                                            <div className="flex items-center gap-2 text-slate-900 font-medium">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                {user.phone || t('Profile.phoneNotProvided')}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Profile.address')}</p>
                                            <div className="flex items-start gap-2 text-slate-900 font-medium">
                                                <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                                                {user.address || t('Profile.addressNotSaved')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                        <h3 className="font-bold text-slate-900 mb-2 text-sm">{t('Profile.updateDetails')}</h3>
                                        <p className="text-slate-500 text-xs mb-4">{t('Profile.updateDetailsDesc')}</p>
                                        <button className="text-primary font-bold text-sm hover:underline">{t('Profile.contactSupport')}</button>
                                    </div>
                                </div>
                            )}

                            {activeTab === "orders" && (
                                <div className="p-8">
                                    <h1 className="text-2xl font-bold text-slate-900 mb-8">{t('Orders.yourOrders')}</h1>

                                    {loading && !selectedOrder && (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                                            <p className="text-slate-500 font-medium">{t('Orders.fetchingOrders')}</p>
                                        </div>
                                    )}

                                    {!loading && orders.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                                <ShoppingBag className="w-10 h-10 text-slate-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('Orders.noOrdersTitle')}</h3>
                                            <p className="text-slate-500 mb-8">{t('Orders.noOrdersDesc')}</p>
                                            <button
                                                onClick={() => router.push("/")}
                                                className="bg-primary text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                                            >
                                                {t('Orders.startShopping')}
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {orders.map((order) => (
                                            <div
                                                key={order.id}
                                                onClick={() => fetchOrderDetails(order.id)}
                                                className="group p-6 bg-white border border-slate-100 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                            <Package className="w-6 h-6 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{t('Orders.orderNumber')}{order.id}</p>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(order.created_at).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-8">
                                                        <div className="hidden sm:block text-right">
                                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">{t('Orders.status')}</p>
                                                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                {t('Orders.confirmed')}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">{t('Orders.total')}</p>
                                                            <p className="font-black text-slate-900">₹{order.total_amount}</p>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 bg-secondary text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">{t('OrderDetails.orderDetails')}</h2>
                                <p className="text-white/60 text-xs">{t('OrderDetails.placedOn')} {new Date(selectedOrder.created_at).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            {/* Status Tracker */}
                            <div className="mb-12 relative flex justify-between px-4">
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-900">{t('OrderDetails.statusTracker.placed')}</p>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-900">{t('OrderDetails.statusTracker.confirmed')}</p>
                                </div>
                                <div className="flex flex-col items-center gap-2 opacity-30">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                        <Package className="w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400">{t('OrderDetails.statusTracker.shipped')}</p>
                                </div>
                                <div className="flex flex-col items-center gap-2 opacity-30">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400">{t('OrderDetails.statusTracker.delivered')}</p>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-4 mb-8">
                                <h3 className="font-bold text-slate-900 text-sm mb-4">{t('OrderDetails.itemsSummary')}</h3>
                                {selectedOrder.items?.map((item: { id: number; variant_id: number; quantity: number; unit_price: number }) => (
                                    <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{t('OrderDetails.variantId')}: {item.variant_id}</p>
                                            <p className="text-xs text-slate-500">{t('OrderDetails.qty')}: {item.quantity} × ₹{item.unit_price}</p>
                                        </div>
                                        <p className="font-black text-slate-900">₹{(item.quantity * item.unit_price).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="bg-slate-50 p-6 rounded-2xl flex flex-col gap-2">
                                <div className="flex justify-between text-xs text-slate-500 font-medium">
                                    <span>{t('OrderDetails.subtotal')}</span>
                                    <span>₹{selectedOrder.total_amount}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 font-medium tracking-tight">
                                    <span>{t('OrderDetails.taxFees')}</span>
                                    <span>₹0.00</span>
                                </div>
                                <div className="flex justify-between text-slate-900 font-black pt-2 border-t border-slate-200 mt-2">
                                    <span>{t('OrderDetails.totalAmount')}</span>
                                    <span className="text-xl">₹{selectedOrder.total_amount}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="text-primary font-bold text-sm hover:underline"
                            >
                                {t('OrderDetails.closeDetails')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
