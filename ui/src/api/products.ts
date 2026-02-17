import api from "./axios";
import type { ApiResponse, ProductVariantResponse, CreateProductVariantRequest, UpdateProductVariantRequest } from "@/types";

export const productsApi = {
    list: (page = 1, perPage = 20) =>
        api.get<ApiResponse<ProductVariantResponse[]>>("/products", { params: { page, per_page: perPage } }),

    get: (id: number) =>
        api.get<ApiResponse<ProductVariantResponse>>(`/products/${id}`),

    create: (data: CreateProductVariantRequest) =>
        api.post<ApiResponse<ProductVariantResponse>>("/products", data),

    update: (id: number, data: UpdateProductVariantRequest) =>
        api.put<ApiResponse<ProductVariantResponse>>(`/products/${id}`, data),

    delete: (id: number) =>
        api.delete(`/products/${id}`),
};
