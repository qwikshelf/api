import api from "./axios";
import type { ApiResponse, CategoryResponse } from "@/types";

export const categoriesApi = {
    list: () =>
        api.get<ApiResponse<CategoryResponse[]>>("/categories"),

    get: (id: number) =>
        api.get<ApiResponse<CategoryResponse>>(`/categories/${id}`),

    create: (data: { name: string }) =>
        api.post<ApiResponse<CategoryResponse>>("/categories", data),

    update: (id: number, data: { name: string }) =>
        api.put<ApiResponse<CategoryResponse>>(`/categories/${id}`, data),

    delete: (id: number) =>
        api.delete(`/categories/${id}`),
};
