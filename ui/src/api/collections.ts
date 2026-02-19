import api from "./axios";
import type { ApiResponse, CollectionResponse } from "@/types";

export interface RecordCollectionRequest {
    variant_id: number;
    supplier_id: number;
    warehouse_id?: number;
    weight: number;
    collected_at?: string;
    notes?: string;
}

export const collectionsApi = {
    list: (page = 1, perPage = 20) =>
        api.get<ApiResponse<CollectionResponse[]>>(`/collections?page=${page}&per_page=${perPage}`),

    record: (data: RecordCollectionRequest) =>
        api.post<ApiResponse<CollectionResponse>>("/collections", data),
};
