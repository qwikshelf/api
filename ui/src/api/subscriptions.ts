import api from "./axios";
import type { ApiResponse } from "@/types";
import type {
    SubscriptionResponse,
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    UpdateSubscriptionStatusRequest,
} from "@/types/subscription";

export const subscriptionsApi = {
    list: (params?: { customer_id?: number; status?: string; frequency?: string }) =>
        api.get<ApiResponse<SubscriptionResponse[]>>("/subscriptions", { params }),

    get: (id: number) =>
        api.get<ApiResponse<SubscriptionResponse>>(`/subscriptions/${id}`),

    create: (data: CreateSubscriptionRequest) =>
        api.post<ApiResponse<SubscriptionResponse>>("/subscriptions", data),

    update: (id: number, data: UpdateSubscriptionRequest) =>
        api.put<ApiResponse<SubscriptionResponse>>(`/subscriptions/${id}`, data),

    updateStatus: (id: number, data: UpdateSubscriptionStatusRequest) =>
        api.patch<ApiResponse<null>>(`/subscriptions/${id}/status`, data),

    delete: (id: number) =>
        api.delete(`/subscriptions/${id}`),

    getDailyRoster: (date: string) =>
        api.get<ApiResponse<import("@/types/subscription").DailyRosterItemResponse[]>>("/subscriptions/roster", {
            params: { date },
        }),

    recordDelivery: (id: number, data: import("@/types/subscription").RecordDeliveryRequest) =>
        api.post<ApiResponse<import("@/types/subscription").SubscriptionDeliveryResponse>>(`/subscriptions/${id}/deliveries`, data),
};
