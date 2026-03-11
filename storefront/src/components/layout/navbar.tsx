"use client"
import { Search, ShoppingCart, User, MapPin, Menu, ChevronDown, Languages, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/store/use-cart";
import { useState, useEffect, use } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/store/use-auth";
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useLocation } from "@/store/use-location";

interface Category {
    id: number;
    name: string;
}

export default function Navbar() {
    const t = useTranslations('Navbar');
    const ts = useTranslations('Serviceability');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const items = useCart((state) => state.items);
    const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const { user, isAuthenticated, logout } = useAuth();
    const { pincode, setLocation, isServiceable } = useLocation();

    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [tempPincode, setTempPincode] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleLocale = () => {
        const nextLocale = locale === 'en' ? 'hi' : 'en';
        router.replace(pathname, { locale: nextLocale });
    };

    const handlePincodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tempPincode || tempPincode.length < 6) {
            setError(ts('pincodeRequired'));
            return;
        }

        setIsChecking(true);
        setError(null);

        try {
            const response = await api.get(`/public/serviceability?pincode=${tempPincode}`);
            if (response.data.data) {
                setLocation(tempPincode, response.data.data);
                setIsLocationModalOpen(false);
            } else {
                setError(ts('notServiceable'));
                setLocation(tempPincode, null);
            }
        } catch (err) {
            setError(ts('notServiceable'));
        } finally {
            setIsChecking(false);
        }
    };

    const { data: categoriesResponse } = useQuery({
        queryKey: ["public-categories"],
        queryFn: async () => {
            const response = await api.get("/public/categories");
            return response.data;
        },
    });

    const categories = categoriesResponse?.data || [];

    useEffect(() => {
        if (pincode) {
            setTempPincode(pincode);
        } else {
            // Auto-prompt for location if not set
            const timer = setTimeout(() => setIsLocationModalOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [pincode]);

    return (
        <header className="sticky top-0 z-50 w-full" onMouseLeave={() => setIsAccountOpen(false)}>
            {/* Top Strip - Location & Links */}
            <div className="bg-secondary text-secondary-foreground text-xs py-1.5 px-4 hidden md:block">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsLocationModalOpen(true)}
                            className="flex items-center gap-1 hover:text-primary transition-colors group"
                        >
                            <MapPin className={cn("w-3.5 h-3.5", isServiceable ? "text-primary" : "text-muted-foreground")} />
                            <span className="group-hover:underline">
                                {pincode ? `${ts('deliverTo')} ${pincode}` : ts('enterPincode')}
                            </span>
                        </button>
                    </div>
                    <div className="flex items-center gap-6">
                        <button
                            onClick={toggleLocale}
                            className="flex items-center gap-1.5 hover:text-primary transition-colors font-medium"
                        >
                            <Languages className="w-3.5 h-3.5" />
                            <span>{locale === 'en' ? 'Hindi (हिन्दी)' : 'English'}</span>
                        </button>
                        <Link href="/account" className="hover:text-primary transition-colors">{t('trackOrder')}</Link>
                        <Link href="/help" className="hover:text-primary transition-colors">{t('helpCenter')}</Link>
                        <Link href="/sell" className="hover:text-primary transition-colors">{t('sell')}</Link>
                    </div>
                </div>
            </div>

            {/* Location Modal */}
            {isLocationModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    {ts('enterPincode')}
                                </h3>
                                <button
                                    onClick={() => setIsLocationModalOpen(false)}
                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handlePincodeSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={tempPincode}
                                            onChange={(e) => setTempPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                            placeholder="e.g. 110001"
                                            className={cn(
                                                "w-full px-4 py-3 bg-slate-50 border-2 rounded-xl text-secondary font-medium transition-all outline-none",
                                                error ? "border-red-100 focus:border-red-500" : "border-transparent focus:border-primary"
                                            )}
                                        />
                                        {isChecking && (
                                            <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-primary" />
                                        )}
                                    </div>
                                    {error ? (
                                        <p className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {error}
                                        </p>
                                    ) : isServiceable && pincode === tempPincode ? (
                                        <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {ts('serviceable')}
                                        </p>
                                    ) : null}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isChecking || tempPincode.length < 6}
                                    className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/95 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    {ts('apply')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Navbar */}
            <nav className="bg-secondary border-b border-white/10 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center gap-4 md:gap-8">
                    {/* Menu & Logo */}
                    <div className="flex items-center gap-2">
                        <button className="p-2 -ml-2 text-white md:hidden">
                            <Menu className="w-6 h-6" />
                        </button>
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform">
                                <span className="text-white font-black text-xl">Q</span>
                            </div>
                            <span className="text-2xl font-black text-white tracking-tighter hidden sm:block">
                                Qwik<span className="text-primary">Shelf</span>
                            </span>
                        </Link>
                    </div>

                    {/* Amazon-style Search Bar */}
                    <div className={cn(
                        "flex-1 flex items-center bg-white rounded-md overflow-hidden transition-shadow duration-200",
                        isSearchFocused ? "ring-2 ring-primary ring-offset-2 ring-offset-secondary shadow-lg" : "shadow-sm"
                    )}>
                        <div className="bg-accent/50 px-3 py-2 text-xs font-semibold text-secondary hidden lg:flex items-center gap-1 border-r border-accent cursor-pointer hover:bg-accent transition-colors">
                            All <ChevronDown size={14} />
                        </div>
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            className="flex-1 px-4 py-2 text-secondary text-sm outline-none placeholder:text-muted"
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                        <button className="bg-primary hover:bg-primary/95 text-white p-2.5 px-4 transition-colors">
                            <Search className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 md:gap-6">
                        {/* Account */}
                        <div
                            className="relative group"
                            onMouseEnter={() => setIsAccountOpen(true)}
                        >
                            <Link
                                href={isAuthenticated ? "/account" : "/login"}
                                className="flex items-center gap-2 text-white hover:text-primary transition-colors group"
                            >
                                <div className="w-9 h-9 border border-white/20 rounded-full flex items-center justify-center group-hover:border-primary transition-colors">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-[10px] text-muted-foreground leading-none">
                                        Hello, {isAuthenticated ? user?.username : t('signIn')}
                                    </p>
                                    <p className="text-xs font-bold leading-tight flex items-center gap-0.5">
                                        {t('account')} <ChevronDown size={10} />
                                    </p>
                                </div>
                            </Link>

                            {/* Dropdown Menu */}
                            {isAccountOpen && (
                                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                    {!isAuthenticated ? (
                                        <div className="px-4 py-3 border-b border-slate-50">
                                            <Link href="/login" className="block w-full bg-primary text-white text-center text-xs font-bold py-2 rounded-md hover:bg-primary/90 transition-colors mb-2">
                                                Sign In
                                            </Link>
                                            <p className="text-[10px] text-slate-500 text-center">
                                                New customer? <Link href="/signup" className="text-primary hover:underline">Start here.</Link>
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="px-4 py-2 border-b border-slate-100">
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Your Account</p>
                                            </div>
                                            <Link href="/account" className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                                                Your Profile
                                            </Link>
                                            <Link href="/account?tab=orders" className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                                                Your Orders
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    logout();
                                                    setIsAccountOpen(false);
                                                }}
                                                className="block w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100 mt-1"
                                            >
                                                Sign Out
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Orders */}
                        <Link href="/account?tab=orders" className="hidden md:block text-white hover:text-primary transition-colors text-left">
                            <p className="text-[10px] text-muted-foreground leading-none">{t('returns')}</p>
                            <p className="text-xs font-bold leading-tight">{t('orders')}</p>
                        </Link>

                        {/* Cart */}
                        <Link href="/cart" className="flex items-center gap-2 text-white hover:text-primary transition-colors relative group">
                            <div className="relative">
                                <ShoppingCart className="w-7 h-7" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-secondary animate-in zoom-in duration-300">
                                        {cartCount}
                                    </span>
                                )}
                            </div>
                            <span className="font-bold text-sm hidden lg:block self-end mb-0.5">Cart</span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Sub-navbar (Categories) */}
            <div className="bg-secondary/95 border-b border-white/5 px-4 py-1.5 overflow-x-auto no-scrollbar hidden md:block">
                <div className="max-w-7xl mx-auto flex items-center gap-6 text-xs font-medium text-white/90 whitespace-nowrap">
                    <button className="flex items-center gap-1.5 hover:text-primary transition-colors font-bold">
                        <Menu className="w-4 h-4" />
                        {t('allCategories')}
                    </button>
                    {categories.map((cat: Category) => (
                        <Link
                            key={cat.id}
                            href={`/category/${cat.id}`}
                            className="hover:text-primary transition-colors"
                        >
                            {cat.name}
                        </Link>
                    ))}
                    <Link href="/deals" className="text-primary font-bold hover:animate-pulse">Flash Deals</Link>
                    <div className="flex-1" />
                    <p className="text-[10px] text-muted-foreground italic">{t('tagline')}</p>
                </div>
            </div>
        </header>
    );
}
