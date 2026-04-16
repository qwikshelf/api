import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export default function ForbiddenPage() {
    const navigate = useNavigate();
    const { getDefaultRoute } = useAuthStore();
    const safeRoute = getDefaultRoute();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="relative inline-flex items-center justify-center">
                    <div className="absolute -inset-4 bg-rose-500/10 rounded-full blur-2xl animate-pulse" />
                    <div className="relative h-24 w-24 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex items-center justify-center border border-rose-100 dark:border-rose-900/30">
                        <ShieldAlert className="h-12 w-12 text-rose-500" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Access Denied</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        You don't have the necessary permissions to access this module. If you believe this is an error, please contact your administrator.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => navigate(-1)}
                        className="rounded-2xl border-slate-200 dark:border-slate-800 font-bold gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" /> Go Back
                    </Button>
                    <Link to={safeRoute} className="w-full">
                        <Button 
                            variant="default" 
                            size="lg" 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20 font-bold gap-2"
                        >
                            <Home className="h-4 w-4" /> 
                            {safeRoute === "/" ? "Dashboard" : "Home"}
                        </Button>
                    </Link>
                </div>

                <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                        Security Event ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
                    </p>
                </div>
            </div>
        </div>
    );
}
