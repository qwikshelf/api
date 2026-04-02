import api from "./axios";
import type { ApiResponse, CustomerResponse, CreateCustomerRequest, UpdateCustomerRequest } from "@/types";

export const customerApi = {
    list: (page = 1, perPage = 20) =>
        api.get<ApiResponse<CustomerResponse[]>>("/customers", { params: { page, per_page: perPage } }),

    get: (id: number) =>
        api.get<ApiResponse<CustomerResponse>>(`/customers/${id}`),

    create: (data: CreateCustomerRequest) =>
        api.post<ApiResponse<CustomerResponse>>("/customers", data),

    createBulk: (data: Partial<CustomerResponse>[]) =>
        api.post<ApiResponse<{ total: number; success: number; failed: number; errors: any[] }>>("/customers/bulk", data),

    update: (id: number, data: UpdateCustomerRequest) =>
        api.put<ApiResponse<CustomerResponse>>(`/customers/${id}`, data),

    delete: (id: number) =>
        api.delete(`/customers/${id}`),
};
