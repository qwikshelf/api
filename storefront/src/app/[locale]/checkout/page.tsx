import { useState } from "react";
import { useCart } from "@/store/use-cart";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { ShoppingBag, CreditCard, ChevronLeft, Loader2, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useLocation } from "@/store/use-location";

export default function CheckoutPage() {
    const t = useTranslations('Checkout');
    const { items, getTotal, clearCart } = useCart();
    const { locationData, isServiceable, pincode } = useLocation();

    const subtotal = getTotal();
    const gst = subtotal * 0.05;
    const shipping = isServiceable && locationData ? locationData.delivery_charge : 0;
    const total = subtotal + gst + shipping;

    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        address: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isServiceable) return;

        setIsLoading(true);

        try {
            const orderData = {
                customer_name: formData.name,
                customer_phone: formData.phone,
                address: `${formData.address}${pincode ? " (Pincode: " + pincode + ")" : ""}`,
                items: items.map((item) => ({
                    variant_id: item.id,
                    quantity: item.quantity,
                })),
            };

            const response = await api.post("/public/orders", orderData);
            const orderId = response.data.data.id;

            // Clear cart and redirect
            clearCart();
            router.push(`/order-success/${orderId}`);
        } catch (error) {
            console.error("Failed to place order:", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">{t('emptyCart')}</h1>
                <Link href="/" className="text-primary font-bold underline">{t('backToShopping')}</Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <Link href="/cart" className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-8 group">
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                {t('backToCart')}
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                {/* Shipping Form */}
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">{t('title')}</h1>

                    {!isServiceable && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-red-600">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-bold">{t('notServiceableWarning')}</p>
                            </div>
                        </div>
                    )}

                    <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="form-group">
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                {t('fullName')}
                            </label>
                            <input
                                required
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl border border-accent focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                placeholder="Oscar Mild"
                            />
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                {t('phone')}
                            </label>
                            <input
                                required
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl border border-accent focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                placeholder="+91 98765 43210"
                            />
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                {t('address')}
                            </label>
                            <textarea
                                required
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl border border-accent focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none"
                                placeholder="Plot 42, Green Meadows Apartment, MG Road, Pune"
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                {t('paymentMethod')}
                            </h2>
                            <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900">{t('cod')}</p>
                                    <p className="text-xs text-slate-500">{t('codDesc')}</p>
                                </div>
                                <CheckCircle2 className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Order Review Card */}
                <div>
                    <div className="bg-slate-50 rounded-3xl p-8 lg:p-10 border border-slate-200 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <ShoppingBag className="w-32 h-32" />
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 mb-8">{t('reviewOrder')}</h2>

                        <div className="max-h-[300px] overflow-y-auto pr-2 mb-8 space-y-4 no-scrollbar">
                            {items.map((item) => (
                                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0">
                                            {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} x {item.unit}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-slate-700 whitespace-nowrap ml-2">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 border-t border-slate-200 pt-8 mb-10">
                            <div className="flex justify-between text-slate-600">
                                <span className="font-medium">{t('subtotal')}</span>
                                <span className="text-slate-900 font-bold">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span className="font-medium">{t('gst')}</span>
                                <span className="text-slate-900 font-bold">{formatCurrency(gst)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span className="font-medium">{t('shipping')} {pincode && `(${pincode})`}</span>
                                {shipping > 0 ? (
                                    <span className="text-slate-900 font-bold">{formatCurrency(shipping)}</span>
                                ) : (
                                    <span className="text-green-600 font-black uppercase">{t('free')}</span>
                                )}
                            </div>
                            <div className="flex justify-between items-end pt-4">
                                <span className="text-lg font-bold text-slate-900 uppercase">{t('total')}</span>
                                <span className="text-4xl font-black text-primary leading-none">{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <button
                            form="checkout-form"
                            disabled={isLoading || !isServiceable}
                            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-primary/20"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    {t('placing')}
                                </>
                            ) : (
                                <>
                                    {t('placeOrder')}
                                    <ArrowRight className="w-6 h-6" />
                                </>
                            )}
                        </button>

                        <p className="text-center text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-widest text-balance">
                            {t('freshnessGuarantee')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
