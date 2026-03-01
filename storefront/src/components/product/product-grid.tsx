"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PublicProduct, PaginatedResponse } from "@/types/storefront";
import ProductCard from "./product-card";
import { ShoppingBag } from "lucide-react";

interface ProductGridProps {
    categoryId?: number;
}

export default function ProductGrid({ categoryId }: ProductGridProps) {
    const { data, isLoading, error } = useQuery<PaginatedResponse<PublicProduct>>({
        queryKey: ["public-products", categoryId],
        queryFn: async () => {
            const url = categoryId ? `/public/products?category_id=${categoryId}` : "/public/products";
            const response = await api.get(url);
            return response.data;
        },
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
                    <div key={id} className="bg-white rounded-lg border border-accent p-4 shadow-sm animate-pulse">
                        <div className="aspect-square bg-slate-100 rounded-md mb-4" />
                        <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                        <div className="h-8 bg-slate-100 rounded w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (error || !data?.data || data.data.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-accent">
                <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400">No products found</h3>
                <p className="text-muted-foreground">Check back later for fresh arrival!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {data.data.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}
