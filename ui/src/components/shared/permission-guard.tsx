import { useAuthStore } from "@/stores/auth-store";

interface PermissionGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    requireAll?: string[];
    requireAny?: string[];
}

export function PermissionGuard({ children, fallback = null, requireAll, requireAny }: PermissionGuardProps) {
    const user = useAuthStore((s) => s.user);
    const userPermissions = user?.permissions?.map(p => typeof p === 'string' ? p : p.slug) || [];

    // Admins bypass permission checks
    if (user?.role?.name === "admin") {
        return <>{children}</>;
    }

    let hasAccess = true;

    if (requireAll && requireAll.length > 0) {
        hasAccess = requireAll.every(p => userPermissions.includes(p));
    }

    if (hasAccess && requireAny && requireAny.length > 0) {
        hasAccess = requireAny.some(p => userPermissions.includes(p));
    }

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
