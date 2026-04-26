import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

interface PermissionGuardProps {
    children: React.ReactNode;
    requireAll?: string[];
    requireAny?: string[];
    fallback?: React.ReactNode;
}

export function PermissionGuard({ children, requireAll, requireAny, fallback }: PermissionGuardProps) {
    const { hasPermission, isAuthenticated } = useAuthStore();

    console.log(hasPermission("can_manage_warehouses"));
    // If not authenticated, let ProtectedRoute handle it (usually redirects to login)
    if (!isAuthenticated()) {
        return <>{children}</>;
    }

    let hasAccess = true;

    if (requireAll && requireAll.length > 0) {
        hasAccess = requireAll.every(p => hasPermission(p));
    }

    if (hasAccess && requireAny && requireAny.length > 0) {
        hasAccess = requireAny.some(p => hasPermission(p));
    }

    if (!hasAccess) {
        // If a specific fallback (like <Navigate to="/" />) is provided, use it.
        // Otherwise, redirect to the new forbidden page.
        return fallback ? <>{fallback}</> : <Navigate to="/forbidden" replace />;
    }

    return <>{children}</>;
}
