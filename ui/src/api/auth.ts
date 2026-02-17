import api from "./axios";
import type { ApiResponse, LoginResponse } from "@/types";

export const authApi = {
    login: (username: string, password: string) =>
        api.post<ApiResponse<LoginResponse>>("/auth/login", { username, password }),

    logout: () => api.post("/auth/logout"),

    me: () => api.get<ApiResponse<{ id: number; username: string; role: string }>>("/auth/me"),
};
