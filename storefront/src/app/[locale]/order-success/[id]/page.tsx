"use client";

import { CheckCircle2, Package, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function OrderSuccessPage() {
    const { id } = useParams();

    return (
        <div className="max-w-3xl mx-auto px-4 py-24 text-center min-h-[70vh]">
            <div className="mb-10 inline-block relative">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
                <CheckCircle2 className="w-24 h-24 text-primary relative z-10" />
            </div>

            <h1 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Order Placed Successfully!</h1>
            <p className="text-lg text-muted-foreground mb-12 max-w-lg mx-auto">
                Thank you for choosing QwikShelf. Your fresh farm products will be delivered to your doorstep within 3 hours.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 mb-12 flex flex-col items-center gap-4">
                <div className="bg-white px-6 py-2 rounded-full border border-accent shadow-sm flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-bold text-slate-900 uppercase tracking-widest text-sm">Order ID: #{id}</span>
                </div>
                <p className="text-sm text-slate-500 font-medium italic">
                    A confirmation SMS has been sent to your registered phone number.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                <Link
                    href="/"
                    className="bg-primary text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 group"
                >
                    <Home className="w-5 h-5" />
                    Back to Home
                </Link>
                <button
                    className="bg-white text-slate-900 border-2 border-slate-900 py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all group"
                >
                    Track Order
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            <div className="mt-20 flex justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl">🤝</div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Trusted</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl">🥛</div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fresh</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl">🚀</div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fast</span>
                </div>
            </div>
        </div>
    );
}
