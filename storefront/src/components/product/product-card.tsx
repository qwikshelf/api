"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Plus, ShoppingCart, AlertCircle } from "lucide-react";
import { PublicProduct } from "@/types/storefront";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/store/use-cart";
import { useTranslations } from "next-intl";
import { useLocation } from "@/store/use-location";

interface ProductCardProps {
    product: PublicProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
    const t = useTranslations('Product');
    const ts = useTranslations('Serviceability');
    const addItem = useCart((state) => state.addItem);
    const { isServiceable, pincode } = useLocation();

    const price = parseFloat(product.selling_price);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        if (pincode && !isServiceable) return;

        addItem({
            id: product.id,
            name: product.name,
            price: price,
            quantity: 1,
            unit: product.unit,
            image: product.image,
        });
    };

    const isButtonDisabled = !!pincode && !isServiceable;

    return (
        <Link href={`/product/${product.id}`} className="bg-white rounded-lg border border-accent p-3 md:p-4 hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
            {/* Product Image */}
            <div className="aspect-square bg-slate-50 rounded-md overflow-hidden mb-4 relative">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <ShoppingCart className="w-12 h-12" />
                    </div>
                )}

                {/* Unit Tag */}
                <span className="absolute top-2 left-2 bg-secondary/80 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                    {product.unit}
                </span>
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                    {product.category_name || product.family_name || t('defaultCategory')}
                </p>
                <h3 className="font-bold text-slate-900 leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {product.name}
                </h3>

                <div className="mt-auto">
                    <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-xl font-extrabold text-slate-900">
                            {formatCurrency(price)}
                        </span>
                        {/* MRP placeholder */}
                        <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(price * 1.1)}
                        </span>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        disabled={isButtonDisabled}
                        className={cn(
                            "w-full py-2 rounded-md font-bold flex items-center justify-center gap-2 transition-all",
                            isButtonDisabled
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/10"
                        )}
                    >
                        {isButtonDisabled ? (
                            <>
                                <AlertCircle className="w-4 h-4" />
                                {ts('notServiceable')}
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                {t('addToCart')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Link>
    );
}
