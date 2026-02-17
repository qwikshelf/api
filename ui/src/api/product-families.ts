import api from "./axios";
import type { ApiResponse, ProductFamilyResponse } from "@/types";

export const productFamiliesApi = {
    list: (page = 1, perPage = 50) =>
        api.get<ApiResponse<ProductFamilyResponse[]>>("/product-families", { params: { page, per_page: perPage } }),

    get: (id: number) =>
        api.get<ApiResponse<ProductFamilyResponse>>(`/product-families/${id}`),

    create: (data: { category_id: number; name: string; description?: string }) =>
        api.post<ApiResponse<ProductFamilyResponse>>("/product-families", data),

    update: (id: number, data: { category_id?: number; name?: string; description?: string }) =>
        api.put<ApiResponse<ProductFamilyResponse>>(`/product-families/${id}`, data),

    delete: (id: number) =>
        api.delete(`/product-families/${id}`),
};
