import api from "./axios";
import type { ApiResponse, ProcurementResponse, CreateProcurementRequest } from "@/types";

export const procurementsApi = {
    list: (page = 1, perPage = 20) =>
        api.get<ApiResponse<ProcurementResponse[]>>("/procurements", { params: { page, per_page: perPage } }),

    get: (id: number) =>
        api.get<ApiResponse<ProcurementResponse>>(`/procurements/${id}`),

    create: (data: CreateProcurementRequest) =>
        api.post<ApiResponse<ProcurementResponse>>("/procurements", data),

    listBySupplier: (supplierId: number) =>
        api.get<ApiResponse<ProcurementResponse[]>>(`/procurements/supplier/${supplierId}`),

    updateStatus: (id: number, status: string) =>
        api.patch(`/procurements/${id}/status`, { status }),

    receiveItems: (id: number, items: { item_id: number; quantity_received: string }[]) =>
        api.patch(`/procurements/${id}/receive`, { items }),
};
