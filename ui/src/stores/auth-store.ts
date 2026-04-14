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
                
                // Superuser check
                if (user.permissions?.some(p => p.slug === "*")) return true;
                
                return !!user.permissions?.some(p => p.slug === permission);
            },
        }),
        {
            name: "qwikshelf-auth",
        }
    )
);
