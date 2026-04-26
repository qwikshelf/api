import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserResponse } from "@/types";

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: UserResponse | null;
    setAuth: (accessToken: string, refreshToken: string, user: UserResponse) => void;
    logout: () => void;
    isAuthenticated: () => boolean;
    hasPermission: (permission: string) => boolean;
    getDefaultRoute: () => string;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            accessToken: null,
            refreshToken: null,
            user: null,
            setAuth: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
            logout: () => set({ accessToken: null, refreshToken: null, user: null }),
            isAuthenticated: () => !!get().accessToken,
            hasPermission: (permission: string) => {
                const user = get().user;
                if (!user) return false;

                // 1. Superuser Wildcard
                if (user.permissions?.some(p => p.slug === "*")) return true;

                // 2. Exact Match
                if (user.permissions?.some(p => p.slug === permission)) return true;

                // 3. Smart Inheritance (e.g., 'resource.manage' or 'resource.create' implies 'resource.view')
                if (permission.includes(".") && permission.endsWith(".view")) {
                    const [resource] = permission.split(".");
                    // If you can manage, create, or update, you can definitely view.
                    return !!user.permissions?.some(p => 
                        p.slug === `${resource}.manage` || 
                        p.slug === `${resource}.create` || 
                        p.slug === `${resource}.update`
                    );
                }

                // Default inheritance for .manage (covers any sub-action)
                if (permission.includes(".")) {
                    const [resource] = permission.split(".");
                    return !!user.permissions?.some(p => p.slug === `${resource}.manage`);
                }

                return false;
            },
            getDefaultRoute: () => {
                const { hasPermission } = get();
                if (hasPermission("dashboard.view")) return "/";
                if (hasPermission("sales.manage")) return "/pos";
                if (hasPermission("subscriptions.view")) return "/deliveries";
                if (hasPermission("inventory.view")) return "/inventory";
                if (hasPermission("customers.view")) return "/customers";
                if (hasPermission("procurement.view")) return "/procurements";
                if (hasPermission("collections.view")) return "/collections";
                if (hasPermission("expenses.view")) return "/expenses";
                return "/";
            },
        }),
        {
            name: "qwikshelf-auth",
        }
    )
);
