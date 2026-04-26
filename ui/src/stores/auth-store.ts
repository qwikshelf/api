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

                // 3. Smart Inheritance (e.g., 'users.manage' implies 'users.view')
                if (permission.includes(".")) {
                    const [resource] = permission.split(".");
                    const managePermission = `${resource}.manage`;
                    return !!user.permissions?.some(p => p.slug === managePermission);
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
                if (hasPermission("expenses.view")) return "/expenses";
                return "/"; // Fallback to root (App.tsx will handle deeper auth)
            },
        }),
        {
            name: "qwikshelf-auth",
        }
    )
);
