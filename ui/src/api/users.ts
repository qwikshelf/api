import api from "./axios";
import type { ApiResponse, UserResponse, CreateUserRequest, UpdateUserRequest } from "@/types";

export const usersApi = {
    list: (page = 1, perPage = 20) =>
        api.get<ApiResponse<UserResponse[]>>("/users", { params: { page, per_page: perPage } }),

    get: (id: number) =>
        api.get<ApiResponse<UserResponse>>(`/users/${id}`),

    create: (data: CreateUserRequest) =>
        api.post<ApiResponse<UserResponse>>("/users", data),

    update: (id: number, data: UpdateUserRequest) =>
        api.put<ApiResponse<UserResponse>>(`/users/${id}`, data),

    delete: (id: number) =>
        api.delete(`/users/${id}`),
};
