"use client";

import { ChevronRight, Zap, ShieldCheck, Truck } from "lucide-react";
import Hero from "@/components/home/hero";
import ProductGrid from "@/components/product/product-grid";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface Category {
  id: number;
  name: string;
  image?: string;
}

export default function Home() {
  const t = useTranslations('Home');
  const { data: categoriesResponse } = useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const response = await api.get("/public/categories");
      return response.data;
    },
  });

  const categories = categoriesResponse?.data || [];

  return (
    <main className="min-h-screen flex flex-col bg-background pb-20">
      {/* Hero Banner Section */}
      <Hero />

      {/* Trust Badges - Amazon Style */}
      <div className="bg-white border-b border-accent py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="text-primary bg-primary/10 p-2 rounded-full">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{t('TrustBadges.freeDelivery.title')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('TrustBadges.freeDelivery.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-primary bg-primary/10 p-2 rounded-full">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{t('TrustBadges.quickDelivery.title')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('TrustBadges.quickDelivery.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-primary bg-primary/10 p-2 rounded-full">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{t('TrustBadges.pure.title')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('TrustBadges.pure.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <span className="text-primary text-sm font-black">24/7</span>
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{t('TrustBadges.farmFresh.title')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('TrustBadges.farmFresh.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Quick Links */}
      <div className="max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-secondary">{t('Sections.shopByCategory')}</h2>
          <button className="text-primary font-medium hover:underline flex items-center gap-1">
            {t('Sections.viewAll')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-8 text-center">
          {categories.map((cat: Category) => (
            <Link
              key={cat.id}
              href={`/category/${cat.id}`}
              className="group cursor-pointer block"
            >
              <div className="aspect-square rounded-full overflow-hidden border-4 border-white shadow-md mb-3 group-hover:scale-110 group-hover:border-primary transition-all duration-300 bg-slate-100 flex items-center justify-center">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-black text-2xl">{cat.name.charAt(0)}</span>
                )}
              </div>
              <p className="text-sm font-bold group-hover:text-primary transition-colors">{cat.name}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Products Section */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-secondary">{t('Sections.freshArrivals')}</h2>
            <div className="hidden md:flex gap-2">
              <span className="text-sm text-muted-foreground">{t('Sections.freshArrivalsSubtitle')}</span>
            </div>
          </div>

          <ProductGrid />
        </div>
      </div>
    </main>
  );
}
