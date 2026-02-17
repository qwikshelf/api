import api from "./axios";
import type { ApiResponse, SupplierResponse, SupplierVariantResponse } from "@/types";

export const suppliersApi = {
    list: (page = 1, perPage = 20) =>
        api.get<ApiResponse<SupplierResponse[]>>("/suppliers", { params: { page, per_page: perPage } }),

    get: (id: number) =>
        api.get<ApiResponse<SupplierResponse>>(`/suppliers/${id}`),

    create: (data: { name: string; phone?: string; location?: string }) =>
        api.post<ApiResponse<SupplierResponse>>("/suppliers", data),

    update: (id: number, data: { name?: string; phone?: string; location?: string }) =>
        api.put<ApiResponse<SupplierResponse>>(`/suppliers/${id}`, data),

    delete: (id: number) =>
        api.delete(`/suppliers/${id}`),

    listVariants: (id: number) =>
        api.get<ApiResponse<SupplierVariantResponse[]>>(`/suppliers/${id}/variants`),

    addVariant: (id: number, data: { variant_id: number; agreed_cost: string; is_preferred: boolean }) =>
        api.post(`/suppliers/${id}/variants`, data),

    removeVariant: (supplierId: number, variantId: number) =>
        api.delete(`/suppliers/${supplierId}/variants/${variantId}`),
};
