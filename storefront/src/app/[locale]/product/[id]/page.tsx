"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PublicProduct } from "@/types/storefront";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/store/use-cart";
import { ShoppingCart, Plus, Minus, ArrowLeft, ShieldCheck, Truck, Zap } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;
    const addItem = useCart((state) => state.addItem);
    const [quantity, setQuantity] = useState(1);

    const { data: product, isLoading, error } = useQuery<PublicProduct>({
        queryKey: ["product", id],
        queryFn: async () => {
            const response = await api.get(`/public/products/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return <div className="max-w-7xl mx-auto px-4 py-20 text-center">Loading product...</div>;
    }

    if (error || !product) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold">Product not found</h1>
                <Link href="/" className="text-primary hover:underline mt-4 block">Return to Home</Link>
            </div>
        );
    }

    const price = parseFloat(product.selling_price);

    const handleAddToCart = () => {
        addItem({
            id: product.id,
            name: product.name,
            price: price,
            quantity: quantity,
            unit: product.unit,
            image: product.image,
        });
        // Optional: show a toast or redirect to cart
    };

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to browse
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Left: Product Image */}
                    <div className="bg-slate-50 rounded-2xl p-8 flex items-center justify-center border border-accent aspect-square overflow-hidden">
                        {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                        ) : (
                            <ShoppingCart className="w-32 h-32 text-slate-200" />
                        )}
                    </div>

                    {/* Right: Product Details */}
                    <div className="flex flex-col">
                        <div className="mb-6">
                            <span className="bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block">
                                Fresh Pick
                            </span>
                            <h1 className="text-4xl font-extrabold text-secondary tracking-tight mb-2">
                                {product.name}
                            </h1>
                            <p className="text-muted-foreground text-lg">
                                Category: <span className="text-secondary font-medium">{product.family_name || "Dairy"}</span>
                            </p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-accent mb-8">
                            <div className="flex items-baseline gap-4 mb-2">
                                <span className="text-3xl font-black text-secondary">
                                    {formatCurrency(price)}
                                </span>
                                <span className="text-muted-foreground line-through">
                                    {formatCurrency(price * 1.15)}
                                </span>
                                <span className="text-green-600 font-bold text-sm">Save 15%</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-6">Inclusive of all taxes</p>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden h-12">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="px-4 hover:bg-slate-200 transition-colors"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <div className="w-12 text-center font-bold text-lg select-none">
                                        {quantity}
                                    </div>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="px-4 hover:bg-slate-200 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                <button
                                    onClick={handleAddToCart}
                                    className="flex-1 bg-primary hover:bg-primary/95 text-white h-12 rounded-lg font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    Add to Cart
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="font-bold text-lg border-b pb-2">Product Highlights</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                    <span className="text-sm font-medium">100% Organic</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Truck className="w-5 h-5 text-blue-500" />
                                    <span className="text-sm font-medium">Fast Delivery</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    <span className="text-sm font-medium">Fresh Daily</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-primary" />
                                    <span className="text-sm font-medium">Zero Preservatives</span>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h3 className="font-bold text-lg mb-2">Description</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Our {product.name} is sourced directly from certified dairy farms.
                                    We ensure rigorous quality checks to maintain its natural taste and nutritional value.
                                    Perfect for your daily needs and family nutrition.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
