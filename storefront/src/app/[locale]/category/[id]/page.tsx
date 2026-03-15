"use client";

import React from "react";
import { useParams } from "next/navigation";
import ProductGrid from "@/components/product/product-grid";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CategoryPage() {
    const params = useParams();
    const categoryId = params.id ? parseInt(params.id as string) : undefined;

    return (
        <main className="min-h-screen bg-slate-50 pb-20">
            {/* Breadcrumbs */}
            <div className="bg-white border-b border-accent py-3 px-4">
                <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Link href="/" className="hover:text-primary">Home</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-secondary font-bold">Category</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-secondary tracking-tight">
                            Category Browse
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Fresh and pure dairy essentials delivered to your doorstep.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="text-muted-foreground">Sort by:</span>
                        <select className="bg-white border border-accent rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 ring-primary">
                            <option>Relevance</option>
                            <option>Price: Low to High</option>
                            <option>Price: High to Low</option>
                            <option>Newest Arrivals</option>
                        </select>
                    </div>
                </div>

                <ProductGrid categoryId={categoryId} />
            </div>
        </main>
    );
}
