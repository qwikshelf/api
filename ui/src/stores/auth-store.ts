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
        }),
        {
            name: "qwikshelf-auth",
        }
    )
);
