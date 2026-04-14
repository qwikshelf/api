import { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";

interface RequirePermissionProps {
    permission: string;
    children: ReactNode;
    fallback?: ReactNode;
}

export function RequirePermission({ permission, children, fallback = null }: RequirePermissionProps) {
    const { hasPermission } = useAuthStore();
    
    if (hasPermission(permission)) {
        return <>{children}</>;
    }
    
    return <>{fallback}</>;
}
