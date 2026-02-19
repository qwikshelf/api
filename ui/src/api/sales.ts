import api from "./axios";

export interface SaleItem {
    variant_id: number;
    quantity: number;
    unit_price: number;
}

export interface CreateSaleRequest {
    warehouse_id: number;
    customer_name: string;
    tax_amount: number;
    discount_amount: number;
    payment_method: "cash" | "card" | "upi" | "credit" | "other";
    items: SaleItem[];
}

export const salesApi = {
    create: (data: CreateSaleRequest) => api.post("/sales", data),
    getHistory: (page = 1, per_page = 20, warehouse_id?: number) =>
        api.get("/sales", { params: { page, per_page, warehouse_id } }),
    getById: (id: number) => api.get(`/sales/${id}`),
};
