"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const banners = [
    {
        id: 1,
        key: "freshMilk",
        image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=1200",
        color: "bg-blue-600",
    },
    {
        id: 2,
        key: "bilonaGhee",
        image: "https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&q=80&w=1200",
        color: "bg-orange-600",
    },
    {
        id: 3,
        key: "paneerCurd",
        image: "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&q=80&w=1200",
        color: "bg-emerald-600",
    },
];

export default function Hero() {
    const t = useTranslations('Banners');
    const [current, setCurrent] = useState(0);

    const next = () => setCurrent((prev) => (prev + 1) % banners.length);
    const prev = () => setCurrent((prev) => (prev - 1 + banners.length) % banners.length);

    useEffect(() => {
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full h-[300px] md:h-[400px] bg-accent overflow-hidden">
            {/* Banners */}
            <div
                className="flex transition-transform duration-700 ease-in-out h-full"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {banners.map((banner) => (
                    <div
                        key={banner.id}
                        className="w-full h-full flex-shrink-0 relative"
                    >
                        <img
                            src={banner.image}
                            alt={t(`${banner.key}.title`)}
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-center px-10 md:px-20 text-white">
                            <div className="max-w-xl space-y-4">
                                <span className={cn("px-3 py-1 rounded text-xs font-bold uppercase tracking-wider", banner.color)}>
                                    {t('featuredDeal')}
                                </span>
                                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                                    {t(`${banner.key}.title`)}
                                </h2>
                                <p className="text-lg text-slate-200 hidden md:block">
                                    {t(`${banner.key}.subtitle`)}
                                </p>
                                <button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105">
                                    {t(`${banner.key}.button`)}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition-all hidden md:block"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition-all hidden md:block"
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-y-1/2 flex gap-2">
                {banners.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "w-2 h-2 rounded-full transition-all cursor-pointer",
                            current === i ? "bg-primary w-6" : "bg-white/50"
                        )}
                        onClick={() => setCurrent(i)}
                    />
                ))}
            </div>
        </div>
    );
}
