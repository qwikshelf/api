import api from "./axios";
import type { ApiResponse, LoginResponse, UserResponse } from "@/types";

export const authApi = {
    login: (username: string, password: string) =>
        api.post<ApiResponse<LoginResponse>>("/auth/login", { username, password }),

    logout: () => api.post("/auth/logout"),

    me: () => api.get<ApiResponse<UserResponse>>("/auth/me"),
};
