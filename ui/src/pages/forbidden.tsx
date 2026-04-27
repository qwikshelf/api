import { useState, useEffect } from "react";
import { ShieldAlert, ArrowLeft, Home, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { NAV_ITEMS } from "@/config/navigation";


export default function ForbiddenPage() {
    const navigate = useNavigate();
    const { hasPermission, getDefaultRoute } = useAuthStore();
    const [countdown, setCountdown] = useState(5);
    const safeRoute = getDefaultRoute();

    // Filter allowed modules to show as alternatives
    const allowedModules = NAV_ITEMS.filter(item => item.permission && hasPermission(item.permission)).slice(0, 3);

    useEffect(() => {
        if (countdown <= 0) {
            navigate(safeRoute);
            return;
        }

        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown, navigate, safeRoute]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 overflow-hidden relative">
            {/* Abstract Background Decoration */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px]" />

            <div className="max-w-2xl w-full text-center space-y-10 relative z-10">
                {/* Header Section */}
                <div className="space-y-6">
                    <div className="relative inline-flex items-center justify-center">
                        <div className="absolute -inset-4 bg-rose-500/10 rounded-full blur-2xl animate-pulse" />
                        <div className="relative h-20 w-20 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center border border-rose-100 dark:border-rose-900/30">
                            <ShieldAlert className="h-10 w-10 text-rose-500" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Wait a moment!</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
                            You don't have the necessary clearance for this specific module, but don't worry—you have access to other workspaces.
                        </p>
                    </div>
                </div>

                {/* Safe Alternatives Grid */}
                {allowedModules.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Suggested Workspaces</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {allowedModules.map((item) => (
                                <Link 
                                    key={item.href} 
                                    to={item.href}
                                    className="group relative bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 text-left"
                                >
                                    <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                                        {item.description}
                                    </p>
                                    <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Redirect Timer & Footer */}
                <div className="pt-4 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button 
                            variant="outline" 
                            size="lg" 
                            onClick={() => navigate(-1)}
                            className="rounded-2xl border-slate-200 dark:border-slate-800 font-bold gap-2 px-8"
                        >
                            <ArrowLeft className="h-4 w-4" /> Go Back
                        </Button>
                        <Link to={safeRoute}>
                            <Button 
                                variant="default" 
                                size="lg" 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20 font-bold gap-3 px-8 relative overflow-hidden group"
                            >
                                <Home className="h-4 w-4 z-10" />
                                <span className="z-10">Continue to {safeRoute === "/" ? "Dashboard" : "Home"}</span>
                                {/* Progress bar for redirect */}
                                <div 
                                    className="absolute bottom-0 left-0 h-1 bg-white/20 transition-all duration-1000 ease-linear"
                                    style={{ width: `${(countdown / 5) * 100}%` }}
                                />
                            </Button>
                        </Link>
                    </div>

                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        Redirecting you to your primary workspace in <span className="text-indigo-500 font-bold text-sm mx-1">{countdown}s</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
