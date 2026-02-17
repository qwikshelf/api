import api from "./axios";
import type { ApiResponse, InventoryLevelResponse, AdjustInventoryRequest, CreateTransferRequest } from "@/types";

export const inventoryApi = {
    list: (page = 1, perPage = 20) =>
        api.get<ApiResponse<InventoryLevelResponse[]>>("/inventory", { params: { page, limit: perPage } }),

    listByWarehouse: (warehouseId: number) =>
        api.get<ApiResponse<InventoryLevelResponse[]>>(`/inventory/warehouse/${warehouseId}`),

    adjust: (data: AdjustInventoryRequest) =>
        api.post("/inventory/adjust", data),

    transfer: (data: CreateTransferRequest) =>
        api.post("/inventory/transfer", data),
};
