// ============================================================
// Subscription TypeScript interfaces matching Go API DTOs
// ============================================================

export type SubscriptionStatus = "active" | "paused" | "cancelled";
export type SubscriptionFrequency = "daily" | "alternate_days" | "weekly" | "monthly";

export interface SubscriptionItemResponse {
    id: number;
    variant_id: number;
    variant_name: string;
    family_name: string;
    unit: string;
    quantity: number;
}

export interface SubscriptionResponse {
    id: number;
    customer_id: number;
    customer_name: string;
    status: SubscriptionStatus;
    frequency: SubscriptionFrequency;
    start_date: string;
    end_date?: string;
    delivery_instructions?: string;
    items: SubscriptionItemResponse[];
    created_at: string;
    updated_at: string;
}

export interface SubscriptionItemRequest {
    variant_id: number;
    quantity: number;
}

export interface CreateSubscriptionRequest {
    customer_id: number;
    frequency: SubscriptionFrequency;
    start_date: string; // "YYYY-MM-DD"
    end_date?: string;
    delivery_instructions?: string;
    items: SubscriptionItemRequest[];
}

export interface UpdateSubscriptionRequest {
    frequency?: SubscriptionFrequency;
    start_date?: string;
    end_date?: string;
    delivery_instructions?: string;
    items?: SubscriptionItemRequest[];
}

export interface UpdateSubscriptionStatusRequest {
    status: SubscriptionStatus;
}

export interface SubscriptionDeliveryItemResponse {
    variant_id: number;
    variant_name: string;
    quantity: number;
    unit_price: number;
}

export interface SubscriptionDeliveryResponse {
    id: number;
    subscription_id: number;
    delivery_date: string;
    status: "delivered" | "failed" | "skipped";
    is_custom: boolean;
    items?: SubscriptionDeliveryItemResponse[];
    notes?: string;
    recorded_by?: number;
    recorded_at: string;
}

export interface RecordDeliveryRequest {
    date: string; // YYYY-MM-DD
    status: "delivered" | "failed" | "skipped";
    items?: { variant_id: number; quantity: number }[];
    notes?: string;
}

export interface DailyRosterItemResponse {
    subscription: SubscriptionResponse;
    delivery?: SubscriptionDeliveryResponse;
}
