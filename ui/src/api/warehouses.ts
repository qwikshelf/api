import api from "./axios";
import type { ApiResponse, WarehouseResponse } from "@/types";

export const warehousesApi = {
    list: () =>
        api.get<ApiResponse<WarehouseResponse[]>>("/warehouses"),

    get: (id: number) =>
        api.get<ApiResponse<WarehouseResponse>>(`/warehouses/${id}`),

    create: (data: { name: string; type: string; address?: string }) =>
        api.post<ApiResponse<WarehouseResponse>>("/warehouses", data),

    update: (id: number, data: { name?: string; type?: string; address?: string }) =>
        api.put<ApiResponse<WarehouseResponse>>(`/warehouses/${id}`, data),

    delete: (id: number) =>
        api.delete(`/warehouses/${id}`),
};
