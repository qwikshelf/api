"use client";

import { useCart } from "@/store/use-cart";
import { formatCurrency } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CartPage() {
    const { items, updateQuantity, removeItem, getTotal } = useCart();
    const total = getTotal();

    if (items.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <div className="bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="w-10 h-10 text-slate-300" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h1>
                <p className="text-muted-foreground mb-8">Ready to start shopping for fresh dairy?</p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-md font-bold hover:bg-primary/90 transition-colors"
                >
                    Browse Products
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 min-h-[60vh]">
            <div className="flex items-center gap-3 mb-8">
                <ShoppingBag className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Shopping Bag</h1>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold">
                    {items.reduce((acc, item) => acc + item.quantity, 0)} items
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Items List */}
                <div className="lg:col-span-2 space-y-6">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-6 p-6 bg-white border border-accent rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                            <div className="w-28 h-28 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 relative">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                        <ShoppingBag className="w-10 h-10" />
                                    </div>
                                )}
                                <span className="absolute top-2 left-2 bg-secondary/80 backdrop-blur-sm text-white text-[9px] uppercase font-black px-1.5 py-0.5 rounded shadow-sm">
                                    {item.unit}
                                </span>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Sold by QwikShelf Dairy Farm</p>
                                    </div>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                        title="Remove item"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="mt-auto flex items-end justify-between">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Quantity</span>
                                        <div className="flex items-center gap-4 border border-accent rounded-lg p-1 w-fit bg-slate-50/50">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600 disabled:opacity-30"
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="text-base font-black min-w-[24px] text-center text-slate-900">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground mb-1">Price per {item.unit}: {formatCurrency(item.price)}</p>
                                        <span className="text-xl font-extrabold text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <Link href="/" className="inline-flex items-center gap-2 text-primary font-bold hover:underline py-4">
                        Continue Shopping
                    </Link>
                </div>

                {/* Summary Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white border-2 border-primary/10 rounded-2xl p-8 sticky top-24 shadow-xl">
                        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-2">
                            Summary
                        </h2>

                        <div className="space-y-5 mb-8 border-b border-dashed border-accent pb-8">
                            <div className="flex justify-between text-slate-600 font-medium">
                                <span>Items Subtotal</span>
                                <span className="text-slate-900">{formatCurrency(total)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 font-medium">
                                <span>Shipping Fee</span>
                                <div className="text-right">
                                    <span className="text-slate-400 line-through text-xs mr-2">₹40</span>
                                    <span className="text-green-600 font-bold uppercase text-sm">Free</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-slate-600 font-medium">
                                <span>Estimated GST (5%)</span>
                                <span className="text-slate-900">{formatCurrency(total * 0.05)}</span>
                            </div>
                        </div>

                        <div className="flex justify-between text-2xl font-black text-slate-900 mb-10">
                            <span>Total Pay</span>
                            <span className="text-primary">{formatCurrency(total * 1.05)}</span>
                        </div>

                        <Link
                            href="/checkout"
                            className="w-full bg-primary text-white py-5 rounded-xl font-black text-lg flex items-center justify-center gap-3 hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-primary/30 active:translate-y-[1px] transition-all shadow-xl"
                        >
                            Checkout Now
                            <ArrowRight className="w-6 h-6" />
                        </Link>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg text-center">
                                <span className="text-primary font-bold text-xs">SAFE</span>
                                <span className="text-[10px] text-muted-foreground uppercase">Checkout</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg text-center">
                                <span className="text-primary font-bold text-xs">PURE</span>
                                <span className="text-[10px] text-muted-foreground uppercase">Quality</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
